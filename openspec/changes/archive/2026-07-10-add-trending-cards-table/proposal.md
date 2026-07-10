## Why

The dashboard shows *which archetypes* are winning but not *which cards* are trending across the metagame. Players want a fast read on the individual cards rising and falling — the "En Tendencia" trending table from the design (deferred item #5). The data is already in `deck_cards`; nothing new needs to be scraped.

## What Changes

- Add an **"En Tendencia" / "Trending" mainboard-cards table**: Top 10 cards for the current metagame view, ranked by **copy share** (total copies of a card ÷ total copies of all cards in the window's mainboards — a 4-of outweighs a 1-of), with rank, card name, `% actual`, `% anterior`, and a ▲/▼/– change indicator (signed pp).
- Add a **"Top Sideboard Cards" list**: Top 10 sideboard cards by copy share over `board='side'`, a lighter list (rank · card · %) with **no** previous/change columns.
- Both tables are **time-frame aware** (recompute per `5days`/`2weeks`) and the mainboard delta compares the immediately-preceding equal-length window (5v5 days, 14v14 days), reusing the 28-day corpus pattern from `add-week-over-week-share-delta`.
- Both tables **respect the sidebar filters**: archetype/tier narrow the slice fully (delta included); an **event filter** recomputes the % within the event but **suppresses the delta column** (a single point-in-time event has no meaningful preceding period).
- **Basic lands are excluded** from both tables (Scryfall `type_line` contains "Basic Land"); nonbasic lands stay.
- **Delta safety**: the `% anterior`/change column is suppressed field-wide when the preceding slice has too few decks; empty slices show a localized empty state.
- **Card art preview** on hover/touch of a card name (reuse `CardArtPreview`); all chrome localized ES/EN, card names stay English.
- Add a **server-side aggregation** (Postgres view/RPC) returning per-card window+board copy counts, because the largest formats hold ~88k `deck_cards` lines — too heavy to pull-and-aggregate client-side. **BREAKING**: requires a manual service-role `supabase/schema.sql` deploy after merge.

## Capabilities

### New Capabilities
- `trending-cards-view`: the trending mainboard table and Top Sideboard Cards list — ranking metric (copy share, basic-lands excluded), time-frame awareness, filter-awareness, the period-over-period delta and its suppression rules, empty states, card-art preview, and ES/EN localization.

### Modified Capabilities
- `metagame-data-pipeline`: add the Postgres view/RPC that aggregates per-card copy counts by format/window/board for read-time consumption (schema addition; no new scraping).

## Impact

- **Schema** (`supabase/schema.sql`): new read-only view/RPC over `decks` + `deck_cards` (+ `events` for date filtering); RLS anon-select. Manual service-role deploy (the "do not modify without a migration task" file — this is that task).
- **Frontend**: new `TrendingTable` / `TopSideboardCards` components, a `useTrendingCards(format, window, filters)` hook, a pure `src/lib/trendingCards.ts` (copy-share + delta, mirroring `shareDelta.ts`), new `trending.*` i18n keys (ES/EN), and placement in the dashboard layout below the archetype grid.
- **No scraper change** — `deck_cards.card_name/quantity/board/type_line/image_url` are already populated.
- Sequencing: schema/RPC PR → frontend PR so every intermediate `main` is safe.
