## 1. Aggregation RPC — creature/spell category

- [ ] 1.1 Extend `top_cards` in `supabase/schema.sql` to return a `category text` column (`creature` when `type_line` contains "Creature", else `spell`), computed with an aggregate expression valid under `GROUP BY card_name` (e.g. `case when bool_or(dc.type_line ilike '%creature%') then 'creature' else 'spell' end`); keep the existing land exclusion and update the function comment (creature/spell + MDFC note). Since the return signature changes, `drop function` then `create or replace`, and re-`grant execute` to anon/authenticated.
- [ ] 1.2 Validate the changed SQL with `pglast`; hand off the manual service-role re-apply (assistant has anon key only). Confirm the RPC returns `category` for a live slice.

## 2. Ranking lib — drop share, add avg + category

- [ ] 2.1 In `src/lib/trendingCards.ts`: add `category: 'creature' | 'spell'` to `TopCardRow`; replace `sharePct` on `TrendingCard` with `avgCopies` (rounded integer); drop the copy-share denominator sum from `rankTrendingCards` and compute `avgCopies = deckCount > 0 ? Math.round(totalCopies / deckCount) : 0`.
- [ ] 2.2 Add a category partition (helper or `category` arg) so mainboard rows split into creatures vs spells before ranking each independently; update/extend unit tests (copy-count ordering, avg rounding, partition, empty slice) and remove the share-based tests.

## 3. Hook — return creatures / spells / sideboard

- [ ] 3.1 In `src/hooks/useTrendingCards.ts`: map the RPC `category` into `TopCardRow`; change the return type to `{ creatures, spells, sideboard, loading, error }`, partitioning the main call's rows by category and ranking each, and ranking the side call into `sideboard`. Keep the two-call structure, the archetype-id resolution, and the stable deps.
- [ ] 3.2 Update the hook's tests for the new return shape.

## 4. Shared table component + i18n

- [ ] 4.1 Create `src/components/TopCardsTable.tsx` (props: `title`, `cards`, `showAvg`) rendering rank · card · [avg `Nx` when `showAvg`] · copies with the header row, container, empty state, and the `TrendingCardName` (dashed underline + `CardArtPreview`) moved here. Delete `src/components/TopSideboardCards.tsx` and `src/components/TrendingTable.tsx` (fold both in); update any imports.
- [ ] 4.2 Update `src/locales/en.json` and `es.json`: add `trending.creaturesTitle` / `trending.spellsTitle` (Trending Creatures / Criaturas en Tendencia; Trending Spells / Hechizos en Tendencia), keep `sideboardTitle`, add an `avg`/`copies` column header key, and remove the now-dead `trending.subtitle` and `trending.col.current` keys.

## 5. Layout + App wiring

- [ ] 5.1 In `src/App.tsx`: consume `{ creatures, spells, sideboard }` from `useTrendingCards` and render three `TopCardsTable` mounts (Creatures + Spells with `showAvg`, Sideboard without) inside `.trending-layout`.
- [ ] 5.2 In `src/styles/dashboard.css`: change `.trending-layout` to `repeat(3, 1fr)` and replace the trending stacking rule so it collapses to a single column below ~900px (order Creatures → Spells → Sideboard).
- [ ] 5.3 Update `src/App.test.tsx`'s `useTrendingCards` mock to return non-empty `{ creatures, spells, sideboard }` so CI frowny-count assertions pass; run the suite with `.env.local` moved aside to verify CI-like.

## 6. Verify, sync specs, docs

- [ ] 6.1 Full regression: `npm run lint`, `npm run type-check`, `npm run test`; live-verify the three tables (correct split, copy counts, `Nx` averages, filters, 3-up → stacked layout) across formats.
- [ ] 6.2 Sync delta specs into `openspec/specs/` (`/opsx:sync`), then update `docs/HANDOFF.md` and `CLAUDE.md` "Shipped so far" to reflect the three-table trending surface.
