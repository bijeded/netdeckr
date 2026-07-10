## 1. Data aggregation (schema PR — lands first)

- [x] 1.1 Spike: `count(*)` / payload check to decide RPC-with-filter-params vs plain view + client per-archetype summing; record the decision in design.md Open Questions
- [x] 1.2 Add the read-only per-card copy-count aggregation to `supabase/schema.sql` (view or RPC over `decks`/`deck_cards`/`events`): per format, card name, board, with total copies + distinct-deck counts, date-range filterable; exclude basic lands (`type_line ILIKE '%Basic Land%'`); anon RLS read-only; idempotent
- [x] 1.3 Validate the SQL with `pglast` (catches reserved-keyword/identifier errors)
- [x] 1.4 Open the schema PR; after merge apply `schema.sql` with the service-role key in the Supabase SQL editor
- [x] 1.5 Verify the aggregation read-only via `curl` with the anon key across all five formats (basics absent, copies summed, both boards)

## 2. Trending logic (pure lib, TDD)

- [x] 2.1 Write tests for `src/lib/trendingCards.ts`: copy share = summed copies ÷ slice total; ranking; basic-land exclusion; top-10 slice
- [x] 2.2 Write tests for the period delta: current vs immediately-preceding equal-length window (5v5, 14v14); ▲ for new-this-period; `DELTA_EPS` flat deadband; `MIN_PREV_DECKS` field-wide suppression
- [x] 2.3 Implement `src/lib/trendingCards.ts` (mirroring `shareDelta.ts`) to pass 2.1–2.2

## 3. Data hook

- [ ] 3.1 Write tests for `useTrendingCards(format, window, filters)`: fetches the aggregation, produces mainboard top-10 (with delta) and sideboard top-10 (no delta), respects archetype/tier (via resolved archetype ids) and event filters, suppresses delta when an event filter is active
- [ ] 3.2 Implement `useTrendingCards` (call the RPC/view for current + preceding windows; wire filter params; empty-state signaling)

## 4. UI components (TDD)

- [ ] 4.1 Write tests for `TrendingTable`: renders rank/name/`% actual`/`% anterior`/change; suppressed delta column when appropriate; empty state; ES/EN chrome with English card names
- [ ] 4.2 Implement `TrendingTable` (mono numerals, `ChangeIndicator`-family ▲/▼/–, `CardArtPreview` on name hover/touch) per the design reference
- [ ] 4.3 Write tests for `TopSideboardCards`: rank/name/% only (no delta columns); empty state; localization
- [ ] 4.4 Implement `TopSideboardCards`
- [ ] 4.5 Add `trending.*` i18n keys to ES + EN locales; add locale-parity coverage

## 5. Dashboard integration

- [ ] 5.1 Render `TrendingTable` + `TopSideboardCards` below the archetype grid in `src/App.tsx`, passing the active format/window/filters; responsive layout — desktop side-by-side (~2/3 trending, ~1/3 sideboard), mobile stacked (trending above sideboard)
- [ ] 5.2 Verify filter-awareness end-to-end: archetype/tier narrow the slice (delta kept); event filter recomputes % and suppresses delta; clear filters reverts
- [ ] 5.3 Run `npm run test`, `npm run type-check`, `npm run lint`; live read-only verification across all five formats (copy-weighting, basics absent, deltas sane, empty states)
