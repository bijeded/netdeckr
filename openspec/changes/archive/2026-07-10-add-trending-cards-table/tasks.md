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

- [x] 3.1 Write tests for `useTrendingCards(format, window, filters)`: fetches the aggregation, produces mainboard top-10 (with delta) and sideboard top-10 (no delta), respects archetype/tier (via resolved archetype ids) and event filters, suppresses delta when an event filter is active
- [x] 3.2 Implement `useTrendingCards` (call the RPC/view for current + preceding windows; wire filter params; empty-state signaling)

## 4. UI components (TDD)

- [x] 4.1 Write tests for `TrendingTable`: renders rank/name/`% actual`/`% anterior`/change; suppressed delta column when appropriate; empty state; ES/EN chrome with English card names
- [x] 4.2 Implement `TrendingTable` (mono numerals, `ChangeIndicator`-family ▲/▼/–, `CardArtPreview` on name hover/touch) per the design reference
- [x] 4.3 Write tests for `TopSideboardCards`: rank/name/% only (no delta columns); empty state; localization
- [x] 4.4 Implement `TopSideboardCards`
- [x] 4.5 Add `trending.*` i18n keys to ES + EN locales; add locale-parity coverage

## 5. Dashboard integration

- [x] 5.1 Render `TrendingTable` + `TopSideboardCards` below the archetype grid in `src/App.tsx`, passing the active format/window/filters; responsive layout — desktop side-by-side (~2/3 trending, ~1/3 sideboard), mobile stacked (trending above sideboard)
- [x] 5.2 Verify filter-awareness end-to-end: archetype/tier narrow the slice; event filter recomputes %; clear filters reverts
- [x] 5.3 Run `npm run test`, `npm run type-check`, `npm run lint`; live read-only verification across all five formats

## 6. Revise per live feedback (exclude all lands; drop delta; show copy count)

Live verification showed the mainboard trending dominated by nonbasic lands (Steam Vents, fetchlands) unlike the reference mockup (spells only), and copy-share deltas mostly flat over these short windows. Per the user: exclude **all** lands, drop the period delta, and show the **total copy count** instead.

- [x] 6.1 Schema: change `top_cards` to exclude **all** lands (`type_line ILIKE '%land%'`, not just basic); re-validate with `pglast`; schema PR + service-role redeploy + live re-verify (no lands in output)
- [x] 6.2 `trendingCards.ts`: drop the period-delta logic (`CardDelta`, `DELTA_EPS`, `MIN_PREV_DECKS`, prev params); `TrendingCard` gains `totalCopies`, loses `delta`; land exclusion is the RPC's job now. Update tests.
- [x] 6.3 `useTrendingCards.ts`: drop the preceding-window call + `prevDeckCount` (main-current + side-current only); no delta suppression. Update tests.
- [x] 6.4 `TrendingTable.tsx`: columns become rank · card · % share · copies (drop % previous + change chip); revert the unused `ShareDelta` `labelKeyPrefix` generalization. Update tests + locale (`trending.col.count`, drop `col.previous`/`col.change`/`change.*`; subtitle no longer "week over week").
- [x] 6.5 App integration + full suite + live re-verify across all five formats (no lands, copy count shown, filters narrow, empty states)
