## Why

The trending surface currently shows a single "En Tendencia" mainboard table (top non-land cards by copy share) plus a Top Sideboard Cards list. Over a 5-day / 2-week window, copy **share** is a noisy metric that mixes creatures and non-creature spells into one ranking, so players can't quickly read "what creatures are being played" vs "what other spells are being played." Splitting the mainboard by card type and swapping share for raw copy counts (plus an average-copies-per-deck signal) makes the tables more concrete and directly actionable for deckbuilding.

## What Changes

- **BREAKING (spec-level):** the single mainboard "Trending" table is split into two: **Trending Creatures** (top 10 mainboard creatures) and **Trending Spells** (top 10 mainboard non-land, non-creature cards).
- Drop the **% copy-share** column from every table; show the **total copy count** instead (mainboard and sideboard).
- Add an **average-copies-per-deck** column to the two mainboard tables: `total copies ÷ decks running it`, rounded to a whole `Nx` (clean 1x–4x range). The sideboard table does **not** get this column.
- Give the **Top Sideboard Cards** table a header row (matching the mainboard tables) so all three align in height, and show copies instead of %.
- Lay the three tables out **1/3 each in one row on desktop**, stacking to a single column below ~900px (order: Creatures → Spells → Sideboard).
- Remove the "Top 10 · copies played" subtitle label; keep only the table titles.
- Delete now-dead code: the `TopSideboardCards` component (folded into a shared table), the copy-share field/denominator, and the obsolete i18n keys (subtitle, % column header).
- Extend the `top_cards` RPC to return a **category** (`creature` / `spell`) per aggregated card so the mainboard split is driven server-side by Scryfall `type_line`, without extra round trips.

## Capabilities

### New Capabilities
<!-- none — this revamps an existing capability -->

### Modified Capabilities
- `trending-cards-view`: the mainboard "Trending" table requirement is replaced by two type-partitioned tables (Creatures / Spells) ranked by total copies with an average-copies-per-deck column; the copy-share metric is removed from all tables; the sideboard list gains a header and shows copies; the responsive layout becomes three equal columns.
- `metagame-data-pipeline`: the per-card copy-count aggregation (`top_cards`) additionally returns a creature/spell category derived from `type_line`.

## Impact

- **Frontend:** `src/lib/trendingCards.ts` (drop share, add category partition + avg), `src/hooks/useTrendingCards.ts` (return creatures/spells/side), a shared `TopCardsTable` component replacing `TrendingTable`/`TopSideboardCards`, `src/App.tsx` wiring, `src/styles/dashboard.css` (3-column layout), `src/locales/en.json` + `es.json` (new titles, removed keys), `src/App.test.tsx` (mock shape).
- **Database:** `supabase/schema.sql` — `top_cards` RPC gains a `category` output column; requires the same manual service-role re-apply (idempotent `create or replace`).
- **No new dependencies.** Card names stay English in both locales; all chrome stays localized.
