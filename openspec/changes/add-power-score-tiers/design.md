## Context

The tier badge is currently `tierFor(sharePct)` in `src/lib/tiers.ts` — fixed cutoffs on metagame share. Share is derived client-side in `src/lib/metagame.ts::deriveBreakdown` from the window's decks (`useMetagame`), which already fetches each deck's `placement` (raw MTGTop8 bracket text: `"1"`, `"2"`, `"3-4"`, `"5-8"`, `"9-16"`, and bare numbers like `"9"`). `TierBadge` already accepts an explicit `tier` prop; today `ArchetypeCard` passes `pct={sharePct}` and lets the badge auto-classify.

Hard constraints from the data:
- **No winrates.** Only a deck's final standing per event.
- **No reliable field size.** MTGTop8 publishes only a top cut, and some events have <4 decklists, so `position / field_size` percentiles can't be computed across events.
- **Survivorship bias.** A popular deck's early losses in large events are never published; we mostly see decks that *made the cut*.

Useful structural fact: the **2-week window contains the 5-day window** by date (`windowStartISO` in `src/lib/windows.ts`; `WINDOW_DAYS` 5 ⊂ 14). So one fetch of the 2-week corpus yields both windows via a client-side date filter.

The methodology must produce a performance ranking under exactly these limits. `deriveBreakdown` and the share display must not change; only what feeds the badge changes.

## Goals / Non-Goals

**Goals:**
- A **Power Score** measuring finish depth ("how deep does this archetype go when it appears"), independent of popularity.
- A **stable tier badge** anchored to the 2-week corpus (no jitter on the window toggle), plus a **trend arrow** that recovers the recent-window signal as momentum.
- Reward rarely-played-but-dominant, avoid over-rating popular-but-mediocre, and damp small-sample noise — using only placements.
- Deterministic, unit-testable pure functions; client-side; no schema/scraper/dependency change; no history table.
- Badge- and arrow-only surface (no raw number); reuse the existing `Tier` type, `TierBadge`, empty/loading states, localized fringe label, and the design's `ChangeIndicator` styling.

**Non-Goals:**
- No field-size weighting or event-strength/quality weighting (no reliable data). Documented limitation.
- No change to grid membership (still top-20 by share) or to the share metric.
- No cross-window trend / history (consistent with 30-day retention).
- No exposed, calibrated "official" constants — the points table and `z` are tunable defaults, not a published contract.

## Decisions

### 1. Placement → finish quality `q ∈ (0, 1]` via a bracket table
Parse the leading integer of the placement (reuse the `\d+` approach from `deckSelection.placementNumber`) and map by MTGTop8's single-elimination bracket structure:

| Standing (leading n) | Bracket | quality `q` |
|---|---|---|
| 1 | champion | 1.00 |
| 2 | finalist | 0.80 |
| 3–4 | top 4 | 0.65 |
| 5–8 | top 8 | 0.45 |
| 9–16 | top 16 | 0.30 |
| 17–32 | top 32 | 0.18 |
| ≥ 33 | beyond | 0.10 |
| empty / unparseable | — | **null** (no usable placement) |

Bucketing by the *leading* number handles both range labels (`"3-4"` → 3 → top-4) and bare Swiss ranks (`"3"` → top-4, `"12"` → top-16) uniformly. Monotonic decreasing, bounded in (0,1].

*Why a table over a formula (e.g. `1/log2(pos)`):* the brackets are the real, discrete structure of the source; a table is transparent, easy to test, and easy to retune. The exact numbers are calibrated constants, isolated in one place.

### 2. Aggregate as a *mean* quality, then shrink with a Wilson-style lower bound
For an archetype with usable-placement decks `q_1..q_n`:
- `p̂ = mean(q_i)` — the central estimate of finish quality. **Mean, not sum**, so volume (popularity) can't buy score: appearing 100× at 9-16 gives `p̂ ≈ 0.30`, worse than appearing 8× mostly top-4.
- **Power Score = Wilson lower bound of `p̂` at sample size `n`**, scaled ×100 (internal only):
  `LB = (p̂ + z²/2n − z·√[(p̂(1−p̂) + z²/4n) / n]) / (1 + z²/n)`
  with a tunable `z` (default ≈ **1.5**; larger z ⇒ harsher small-sample penalty).

*Why this shape:*
- **Mean quality** addresses survivorship bias: every archetype's published decks are upward-biased, but that bias applies to the *central estimate* roughly uniformly, so relative ordering is preserved. Popularity enters only through `n` (confidence), never through the central value.
- **Wilson lower bound** is the small-sample guard the user chose (no hard floor): `n=1, p̂=1.0` collapses far below 1.0 (a single lucky win won't be T1); a strong record over many decks keeps its LB near `p̂`. This is a deliberate *approximation* — `q` is graded, not Bernoulli 0/1, so `p̂(1−p̂)` overstates variance somewhat; acceptable and documented, and it errs conservative (wider interval ⇒ more shrink), which is the safe direction for a noise guard.

*Alternatives considered:* Laplace/Bayesian shrink toward a prior mean (simpler but needs a prior we'd have to justify); raw mean (no small-sample control — rejected); summed points (rewards volume = popularity — rejected, defeats the purpose).

### 3. Stable tiers anchored to the 2-week corpus, cut by Jenks natural breaks
The tier badge is computed from each archetype's **Last-2-Weeks Power Score** and is **stable across the window toggle** (switching 5days⇄2weeks never changes a badge). Rationale: the 5-day sample is small and noisy — recomputing tiers per window makes badges jitter. Anchoring to the larger 2-week corpus gives an authoritative, steady tier; the recent-window signal is surfaced separately as a trend arrow (Decision 5).
- **Reference field:** the **2-week top-20 by share** (bounded, meaningful, stable). Compute their 2-week Power Scores and partition with 1-D **Fisher–Jenks** (DP-optimal natural breaks, minimizes within-class variance) into up to 4 classes → 3 break points.
- **Classify:** a displayed archetype's tier = which break interval its **own** 2-week Power Score falls into (every displayable archetype has 2-week data, since 2weeks ⊇ 5days). So the same archetype → same 2-week score → same interval → same badge, whichever window is selected.
- **< 4 distinct scores:** classes = number of distinct scores, mapped from the **top** (best cluster = T1); unused lower tiers just don't appear.
- **Cutoffs adapt to the field, not fixed thresholds** — as new data shifts the 2-week field's spread, the breaks move (on the next load). Jenks is O(k·n²) — trivial at n≤20.

### 4. Recent-window trend arrow (the recovered signal)
On the **Last 5 Days** view, each card shows a ▲/▼/– arrow comparing the selected window's performance to the **2-week baseline**, per archetype. Reuses the design system's `ChangeIndicator` styling **without a history table** — both windows are in the single fetch. (This is *window-over-window momentum*, distinct from the handoff's deferred item #3, which is *week-over-week* and needs a history table.)
- **Not shown on the 2-week baseline view.** There the selected window *is* the baseline, so a comparison is meaningless — rather than render a permanently-flat chip, the arrow is simply absent (`trend = null`). A genuinely meaningful 2-week-view trend (recent-half vs older-half / week-over-week) is deliberately **out of scope** — deferred as too complex for this change.
- **Compare the raw mean finish-quality `p̂`, NOT the Wilson-shrunken score.** The 5-day subset has smaller `n`, so its Wilson LB is shrunk harder than the 2-week LB; comparing shrunken scores would bias every arrow downward from sample size, not real performance. Comparing `p̂_selected` vs `p̂_2week` isolates genuine momentum. This is the faithful reading of "increase/decrease in *power*": the shrink is a confidence adjustment for the *badge*, not a measure of power.
- `trend = sign(p̂_selected − p̂_2week)` with a small deadband `ε` (tunable, default ≈ 0.02 on the 0–1 quality scale) → `'up' | 'down' | 'flat'`.
- **Minimum-recent-deck guard:** if the archetype has fewer than `MIN_TREND_DECKS` usable placements in the selected window (tunable, default **3**, which also covers the zero-usable case), `trend = 'flat'` — one or two recent results can't swing the arrow.
- **`ArchetypeShare.trend: Trend | null`** — `null` ⇒ the card renders no indicator (the 2-week view); `'up' | 'down' | 'flat'` ⇒ the card renders the arrow (the 5-day view).
- **Arrow-only:** direction glyph + semantic color (up `--up`, down `--down`, flat `--flat`), **no numeric delta** (keeps the raw score hidden), plus a localized `aria-label`.

### 5. One fetch of the 2-week corpus, selected window by client-side filter
`useMetagame` fetches the **2-week** decks once (regardless of the selected window) and derives the selected window with a client-side `event_date >= windowStartISO(selected)` filter. Because 2weeks ⊇ 5days, this reproduces today's 5-day set exactly (share/grid unchanged) while also providing the 2-week corpus (for the stable tier) and both windows' placements (for the trend) — from a single query. This matches `project.md`'s stated model ("client-side date filters over the decks").

### 6. Code shape (client-side, pure, testable)
- **New `src/lib/powerScore.ts`:**
  - `finishQuality(placement: string): number | null` — bracket table (Decision 1).
  - `meanQuality(placements: string[]): number | null` — mean of usable `q`; `null` if none.
  - `wilsonLowerBound(pHat: number, n: number, z?: number): number`
  - `archetypePowerScore(placements: string[], z?: number): number` — `meanQuality` → Wilson LB ×100; `0` when no usable placements.
  - `jenksBreaks(values: number[], classes: number): number[]`
  - `assignTiers(scoresByArchetype: Map<string, number>, referenceScores: number[]): Map<string, Tier>` — Jenks over `referenceScores` (the 2-week top-20), classify each archetype's 2-week score.
  - `windowTrend(selected: string[], baseline: string[], opts?: { eps?: number; minSelected?: number }): Trend` — `sign(meanQuality(selected) − meanQuality(baseline))` with deadband `eps`; `'flat'` when the usable count of `selected` is below `minSelected` (default 3, covers zero). Type `Trend = 'up' | 'down' | 'flat'`.
- **`src/lib/metagame.ts`:** `DeckForBreakdown` gains `placement: string`; `ArchetypeShare` gains `tier: Tier` and `trend: Trend | null` (`null` ⇒ no indicator, used for the 2-week baseline view). `deriveBreakdown` keeps its share/rank/top-20 logic unchanged (over the *selected* decks). A new pure orchestrator (given the 2-week decks + selected decks grouped by archetype, and whether the selected window is the baseline) computes the 2-week reference breaks + per-archetype 2-week scores, attaches the stable `tier`, and attaches `trend` = `null` when the selected window is the baseline, else `windowTrend(...)`. Kept in `lib` (not JSX / not the hook body) so it is unit-testable.
- **`src/hooks/useMetagame.ts`:** query the 2-week window; build 2-week groups (with `placement`) and the selected-window subset via the client-side date filter; call `deriveBreakdown` (selected) + the orchestrator; expose `breakdown` (now carrying `tier`/`trend`).
- **`src/components/TrendIndicator.tsx`:** port `design/components/data/ChangeIndicator.jsx` as React+TS, driven by `Trend` (not a number), rendering glyph + color only + localized `aria-label`.
- **`src/components/ArchetypeCard.tsx`:** take `tier: Tier` and `trend: Trend | null` props; pass `tier={tier}` to `TierBadge` (drop `pct` for the badge; share number/bar keep `sharePct`) and render `<TrendIndicator>` **only when `trend != null`** (so the 2-week view shows no arrow). `App.tsx` threads `share.tier` / `share.trend`.
- **`src/lib/tiers.ts`:** retire `tierFor(pct)`; keep the `Tier` type (and add a `Trend` type here or in `powerScore.ts`). Update `tiers.test.ts`.
- No JSX computation (framework rule): all math in `lib`, shaped before render.

## Risks / Trade-offs

- **Graded-Wilson is an approximation** (variance of graded `q` ≠ Bernoulli). → Documented; it errs conservative (more shrink), the safe direction; constants (`z`, quality table) isolated and tunable, covered by tests asserting *properties* (monotonicity, small-sample shrink) rather than exact magic numbers.
- **Trend on a small 5-day subset is noisy** (e.g. one recent 1st-place deck ⇒ ▲). → Mitigated by the `MIN_TREND_DECKS` guard (default 3): below it the arrow is flat, so one or two results can't swing it. Plus the deadband `ε` suppresses trivial moves, and it is a *secondary hint* — the badge stays robust on the 2-week corpus regardless.
- **Comparing shrunken scores would bias the arrow downward** on the smaller window. → Mitigated by design: the trend compares raw mean quality `p̂`, not the Wilson LB (Decision 4).
- **Grid is still top-20 by share**, so a dominant deck below rank 20-by-share is never displayed and its high tier is invisible. → Accepted for v1 (share/breakdown must stay as-is); noted as future work (perf-based grid inclusion).
- **No field-size / event-strength weighting.** → Unavoidable (no reliable field size); relative ordering within the published cut is still meaningful; documented.
- **Relative tiers always produce a "T1"** even in a weak field. → Intended: competitive tier lists are field-relative ("best decks right now"); consistent with Jenks-by-design.
- **Constant tuning could shift borderline badges/arrows.** → Property-based tests keep behavior stable; a later calibration pass against live data can retune the table / `z` / `ε` without API changes.

## Migration Plan

Pure frontend change, single PR feasible (task-execution may split into lib → wiring). No data migration, no schema/scraper deploy, no manual Supabase step. Rollback = revert the PR (share-based `tierFor` behavior returns). Verify against live data by loading each format/window and sanity-checking that deep-finishing archetypes out-rank popular-but-shallow ones.

## Open Questions

- Default `z` (≈1.5), the quality table, the trend deadband `ε` (≈0.02), and `MIN_TREND_DECKS` (3) are first-pass calibrations; a follow-up may retune them against a live snapshot. Not blocking — property tests don't depend on the exact values.
- A meaningful trend on the 2-week baseline view (week-over-week: recent-half vs older-half, or a stored previous snapshot) is deferred — related to the handoff's deferred item #3 and out of scope here.
