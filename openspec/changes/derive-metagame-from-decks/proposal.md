## Why

The dashboard blends **two different archetype naming systems glued together by name**. The archetype cards (and their share %) come from MTGTop8's *pre-aggregated* breakdown — coarse buckets like "Izzet Control" 21%, stored in `metagame_snapshots`. The decklists under each card come from MTGTop8's *event result* pages, which use fine-grained, correct names ("Izzet Lesson", "Izzet Spellementals"), stored in `decks`. The frontend matches decks to cards **by name**, so whenever the aggregate label doesn't equal a deck-page name, a card shows a high share with **zero or one deck** (Problem 2) under the **wrong name and inflated share** (Problem 3). They are the same bug.

Now that Change 1 (`scrape-full-two-week-window`) has landed a complete 2-week deck corpus, we can dissolve both problems by making **decks the single source of truth**: derive each archetype's metagame share by counting our own scraped decks (using the deck-page names). Every card then has a correct name, an honest share, and — by construction — real decks under it.

## What Changes

- **Derive the metagame breakdown from decks (frontend).** One hook fetches a window's decks once, then produces both the ranked archetype breakdown (deck count per archetype → `share = count / total`, top 20) and the per-archetype display decks. The archetype cards render from this derived breakdown; the drill-down uses the same rows, so a shown archetype always has decks.
- **Freshness becomes per-format.** The "Updated X ago" indicator reads `formats.last_updated_at` (stamped by the scraper per format on a successful run) instead of the per-(format, window) freshness table.
- **Retire the stored breakdown.** The scraper stops fetching/parsing/storing MTGTop8's aggregate breakdown; the frontend stops reading it.
- **BREAKING (schema):** **drop `metagame_snapshots` and `format_window_freshness`**, and with them the `meta_window` column concept entirely. Applied manually with the service-role key after the code merges (safe — nothing reads or writes them by then).
- Per-archetype display count 4 → 6.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: the archetype breakdown is **derived from the window's decks** (deck counts) rather than a stored snapshot; every displayed archetype has decks; the time-frame filter updates the derived breakdown by date range; the freshness indicator is per-format.
- `metagame-data-pipeline`: **removes** the metagame-snapshot schema, the `meta_window` column, and the "MTGTop8 scraper populates the breakdown" requirement; the scraper stamps a **per-format** last-updated timestamp; parsing-fixture coverage narrows to the decklist/event-list path.

## Impact

- **Frontend:** new `useMetagame` hook (merges `useMetagameBreakdown` + `useDecks`); `useLastUpdated` → `formats.last_updated_at`; `App.tsx` wiring; `deckSelection.ts` display count; removal of `metagame_snapshots`/`format_window_freshness` reads.
- **Scraper:** remove `pipeline.py` breakdown pass + its `run.py` wiring; drop `parse_meta_breakdown`/`rank_archetypes` (mtgtop8.py) and `replace_breakdown`/`stamp_updated` (writer) once unused; add per-format `formats.last_updated_at` stamping; clean up the now-unused `WINDOWS` list (`WINDOW_META` stays for the 2-week decklist meta-id resolution).
- **Schema (`supabase/schema.sql` — explicit migration):** drop the two tables + `meta_window`; remove their create/migration/RLS/grant blocks; rework the one-time archetype-dedupe block that references `metagame_snapshots` (`has_snapshot`); add `drop table … cascade` so applying the schema removes them on the existing DB.
- **Docs/memory:** CLAUDE.md, `openspec/project.md`, `docs/HANDOFF.md`; update the `meta-window` auto-memory (column removed).
- **No data loss:** decks/cards/archetypes (incl. signature art) are untouched; only the derived-from-them snapshot tables go away.
