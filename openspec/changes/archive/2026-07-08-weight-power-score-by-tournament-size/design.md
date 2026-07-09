## Context

The Power Score (`src/lib/powerScore.ts`) scores an archetype from its decks' finish qualities: it takes the **mean** finish quality and applies a **Wilson lower bound** over `n` = the number of usable placements, then cuts the field into T1/T2/T3/Otros via **Fisher–Jenks** natural breaks over the whole 2-week corpus. Every finish counts equally regardless of the tournament it came from, and the only small-sample governor is the Wilson shrink at `Z_DEFAULT ≈ 1.5`. Live verification of `retune-breakdown-cap-and-tier-field` (handoff #15/#7) found this produces a **broad Tier 1** in large formats (Pauper 24, Modern 17), inflated by single-deck archetypes that won their one tiny event.

Tournament size is **not captured anywhere today**: `events` has no player-count column and `scraper/mtgtop8.py` does not parse it. MTGTop8 displays a player count on the event page for many — but not all — events.

This is a cross-stack change: schema (`events.player_count`) → scraper (parse + persist) → frontend (thread size onto decks, size-weight the score, tune the small-sample penalty).

## Goals / Non-Goals

**Goals:**
- Record each event's player count when MTGTop8 reports it (nullable, additive schema).
- Weight the Power Score so finishes from larger tournaments are trusted more (raise the effective Wilson `n`), and default a missing size to a small event.
- Tighten Tier 1 (harsher small-sample penalty and/or a min-deck T1 floor) so single-tiny-event winners no longer flood it.
- Keep share %, StatCard totals, trending, and decklists byte-for-byte unchanged.
- Keep `main` safe at every intermediate PR state.

**Non-Goals:**
- No history table; no week-over-week delta (still deferred).
- No change to the metagame share (popularity) computation.
- No backfill of player counts onto events already stored before this change beyond what the normal incremental re-scrape achieves (incremental scraping skips already-stored events, so a one-time `--refresh`-style pass or a forced re-scrape may be needed to populate sizes on the existing corpus — treated as a post-merge operational step, like the schema-deploy dance).
- Not addressing deferred #8 (color-identity splash floor).

## Decisions

### 1. Schema: `events.player_count integer` (nullable)
Additive column in `supabase/schema.sql`, validated with `pglast`. `player_count` is not a reserved word. RLS unchanged (anon SELECT already covers the row). Applied manually via the service-role key (idempotent `add column if not exists`), per the schema-deploy dance.

### 2. Scraper: parse size from the event page, persist idempotently
`parse_event_size(html) -> int | None` in `scraper/mtgtop8.py`, reading the player-count string MTGTop8 renders on the event results page (the same HTML `parse_event_decks` already consumes — so no extra fetch). New fixtures: an event page **with** a size and one **without**. `SupabaseWriter` upsert of the event includes `player_count`; the update path writes a newly available/changed size but **never overwrites a non-null stored size with null** (guard in the writer). Unit-tested against fixtures, no network.

### 3. Frontend: thread size onto decks, size-weight the Wilson `n`
- `useMetagame`/`metagame.ts` select `events.player_count` and carry it onto each `DeckRow` (a nullable `playerCount`), alongside the existing event date used for windowing.
- `powerScore.ts` gains a **size weight** per deck: `w(size) = clamp(size / SIZE_REF, W_MIN, W_MAX)` with a **small-size default** applied when `size` is null/absent (weight at the low end, e.g. `W_MIN`). The score becomes the Wilson lower bound of the **size-weighted mean** finish quality over an **effective `n` = Σ w_i** (sum of weights) rather than the raw count. Larger tournaments raise `Σ w`, shrinking less; all-tiny or unsized fields keep a small effective `n`, shrinking hard. When every size is null, all weights collapse to the small default and behaviour degrades to a uniformly-shrunken (never erroring) score.
- The public `archetypePowerScore` signature changes from `placements: string[]` to a richer input carrying `(placement, size)` pairs; the existing pure API is adapted and its tests updated. `windowTrend` continues to compare **raw** (unshrunken, and — decision below — **unweighted**) mean quality, so the arrow still reflects a real performance change, not a size artifact.

### 4. Tier 1 min-deck floor + tuned `Z_DEFAULT`
Add a `T1_MIN_DECKS` constant: an archetype with fewer supporting decks than the floor is **capped at T2** (assigned by its Jenks interval, but not allowed into T1) — it is never forced to the fringe tier, preserving the "no hard floor to fringe" guarantee. Independently, `Z_DEFAULT` is raised (harsher small-sample penalty). Both constants sit at the top of `powerScore.ts` and are tuned against live data during verification; property tests stay value-independent (monotonicity, graceful degradation, share-invariance).

### 5. Trend uses unweighted raw quality
The `TrendIndicator` compares selected-window vs 2-week **raw mean finish quality**. It stays **unweighted** by size so a shift in which tournaments happened to be in the 5-day window doesn't masquerade as a performance change — the arrow measures how *deep* the archetype finished, not how big its recent events were.

## Risks / Trade-offs

- **Coverage of sizes.** Many events lack a displayed size, so early on the score is dominated by the small-size default and the size signal is weak until coverage grows over the 30-day corpus. Acceptable: the default is conservative and the tier stays monotonic; verify live that T1 narrows even at partial coverage.
- **Weight-curve tuning is a judgement call.** `SIZE_REF`, `W_MIN`, `W_MAX`, `Z_DEFAULT`, `T1_MIN_DECKS` interact. Mitigation: constants centralized + property tests value-independent; calibrate against all five formats live (as `add-power-score-tiers` did), checking T1 breadth and monotonicity.
- **Effective-n Wilson is a heuristic.** Using `Σ w` as the Wilson `n` is not a textbook weighted CI, but it preserves the existing model's shape and the desired ordering (more/bigger evidence ⇒ less shrink). Documented as a deliberate approximation.
- **Cross-stack sequencing.** Frontend must default null size to small **before** relying on the column; schema+scraper add it without breaking reads. Order PRs so each intermediate `main` state is safe (frontend-tolerant-of-null → schema → scraper populate), mirroring `derive-metagame-from-decks`.
- **Operational backfill.** Incremental scraping skips stored events, so existing rows won't get sizes automatically; a forced re-scrape (or accepting gradual coverage as old events prune out within 30 days) is the fallback — a post-merge step, not code.
