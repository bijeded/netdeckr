## Context

The app renders archetype cards from `metagame_snapshots` (MTGTop8's aggregate breakdown) and the drill-down decks from the `decks` table, joined **by archetype name**. MTGTop8 uses coarse labels on the breakdown page (`archetype?a=…`) and fine-grained names on event result pages (`…&d=…`); when they diverge, a card shows a share with no matching decks (Problem 2) under the wrong name/share (Problem 3).

Change 1 landed a complete, correctly-scoped 2-week deck corpus (verified: 2,275 decks across five formats). This change is the pivot: compute the metagame from those decks so there is one naming system and one source of truth. Frontend-derived was chosen (over scraper-computed snapshots) in brainstorming because it makes decks the literal source for both the cards and the drill-down, removes a whole storage/scrape path, and makes future date-based filters trivial.

Constraints: disciplined mode (TDD, per-group PRs, subagent review); `supabase/schema.sql` changes only via an explicit migration task (this is it); the schema is applied manually with the service-role key (a human/CI step), decoupled from code merges.

## Goals / Non-Goals

**Goals:**
- Archetype cards, names, and shares come from counting our own decks (deck-page names); every card has decks.
- Remove the stored-breakdown path end to end (frontend read, scraper write, schema tables).
- Per-format freshness from `formats.last_updated_at`.
- No broken intermediate on `main` across the frontend/scraper/schema split.

**Non-Goals:**
- Changing how decks/cards/archetype-art are scraped or stored (untouched).
- Week-over-week deltas, trending, or new filters (separate future changes).
- Reconciling our shares back to MTGTop8's headline numbers — the correction *is* the point.

## Decisions

### D1: Derive the breakdown in the frontend from one deck fetch
A single `useMetagame(format, window)` hook fetches the window's decks (join `archetypes(name, color_identity, art_image_url, art_crop_url)` + `events(event_date)`, filtered by `event_date >= windowStartISO(window)`), then produces **both** outputs from the same rows: `breakdown` = group by archetype → `share = deckCount / totalDecks * 100`, ranked by count descending, top 20 (carrying color identity + art); and `decksByArchetype` = existing `selectDisplayDecks` per archetype. This guarantees the cards and the drill-down are the same entities. It replaces `useMetagameBreakdown` (snapshot read) and folds in `useDecks`.

**Alternative considered:** scraper-computed snapshots (keep the table, fill it from deck counts). Rejected in brainstorming — keeps a second source that can drift from the drill-down, and retains the `meta_window` reserved-word footgun.

### D2: Freshness is per-format via `formats.last_updated_at`
With windows now pure client-side date filters, freshness is "when did this format last scrape," not per-window. `useLastUpdated` reads `formats.last_updated_at` by `format_code`; the scraper stamps it per format at the end of a successful run (it currently stamps only `format_window_freshness`, which is being dropped).

### D3: Safe ordering — frontend → scraper → schema (no broken intermediate)
The tables are the shared contract. To keep `main` always working:
1. **Frontend** stops reading `metagame_snapshots`/`format_window_freshness` and derives from decks. Safe standalone: decks already exist; snapshots keep being written but are ignored. Only cosmetic effect: `formats.last_updated_at` may be null/stale for one merge cycle, so the freshness line may be hidden until group 2 (graceful — `useLastUpdated` returns null → indicator simply doesn't render).
2. **Scraper** stops writing the breakdown and starts stamping `formats.last_updated_at`. Now nothing reads or writes the snapshot tables.
3. **Schema** drops the tables. A human applies `schema.sql` with the service-role key *after* the merge — safe because no code path touches them by then.

This is the ordered-split alternative to bundling one mega-PR; it is safe here (unlike the `meta_window` case) because a wrong/again-written snapshot can only affect a now-unread table, never stored deck data.

### D4: `schema.sql` surgery, not just `DROP`
`metagame_snapshots`/`format_window_freshness` are woven through `schema.sql`: create blocks, feature-1 migration blocks, a one-time `meta_window` remap, RLS policies, grants, and the archetype-dedupe block that picks a canonical row by `has_snapshot`. All of those are removed or reworked (dedupe now prefers the lowest id and no longer moves snapshots), and `drop table if exists … cascade` statements are added so applying the updated (idempotent) schema removes the tables on the live DB.

### D5: Keep `WINDOW_META`, drop the `WINDOWS` list usage
The decklist pass still resolves the 2-week `meta` id per format via `WINDOW_META`/`meta_id_for`, so that mapping stays. The `WINDOWS` list (`5days`/`2weeks`) only fed the breakdown pass — it becomes unused and is cleaned up. `archetypes.color_identity` is unaffected: `upsert_archetype` already derives it from the name.

## Risks / Trade-offs

- **Our shares won't match MTGTop8's headline numbers** (finer-grained). → Intended correction (Problems 2/3); documented for users.
- **Derived breakdown fetches all window decks instead of 20 snapshot rows** → at ~500 decks/format for two weeks these are lightweight rows (no card bodies — those load on modal open); grouping is O(n). Negligible.
- **Freshness hidden for one merge cycle** (group 1 before group 2) → cosmetic; the indicator gracefully omits when `last_updated_at` is null.
- **Schema drop is destructive** → but only of *derived* tables; decks/cards/archetypes remain. Apply after code merges; `schema.sql` stays idempotent/re-runnable.
- **A format+window with no recent decks yields an empty breakdown** → the existing loading/empty/error states already cover this (empty = friendly state, not a crash).

## Migration Plan

1. Merge group 1 (frontend), then group 2 (scraper) in close succession, then group 3 (schema).
2. After group 3 merges, a human applies `supabase/schema.sql` with the service-role key (drops the two tables) and, optionally, `gh workflow run scrape.yml --ref main` to stamp `formats.last_updated_at` fresh.
3. Rollback: revert the code PRs; the dropped tables can be recreated by re-applying an earlier `schema.sql` and re-running the scraper, but this is not expected (the tables hold only derived data).

## Open Questions

- None blocking. (Trending/top-cards and week-over-week deltas remain separate future changes that will reuse this single deck corpus.)
