# Tasks

## 1. Database (migration)

- [x] 1.1 Add to `supabase/schema.sql` (explicit migration task for this change): the `recent_set_cards` table (canonical `card_name` primary key, `set_code`, `set_name`, `released_at`), RLS enabled with an anon/authenticated read policy and no write policy, and the `recent_set_top_cards` RPC per design D4 (no board predicate, basic-land-only exclusion, inner join on `scryfall_name`, same slice parameters and banned-deck clause as `top_cards`, `security invoker`, execute granted to anon/authenticated), with comments cross-referencing `top_cards`. Verify by applying it to a scratch/local Postgres (or Supabase SQL editor on a branch) without error, then calling the RPC as anon and checking it returns rows, combines boards, keeps a nonbasic land, drops a snow basic, and that an anon insert into `recent_set_cards` is rejected

## 2. Scraper: derive and store the recent sets

- [x] 2.1 Extend `CardIndex.from_bulk_rows` (`scraper/scryfall.py`) to take `today` and derive the two most recent main sets and their name→(newer set code, set name, release date) membership per design D2, exposed through a `CardIndex` accessor; thread `today` through `build_card_resolver`/`sync_bulk` callers. Add `scraper/tests/test_scryfall.py` cases built from inline rows (do not touch `tests/fixtures`) for every `recent-main-sets` identification and membership scenario: latest-two chosen, future-dated set excluded, commander/masters/draft-innovation/box/digital excluded, reprint recorded, membership independent of the display printing, card in both sets → newer code, multi-face canonical name, `reversible_card` skipped, set-code tiebreak. Verify `cd scraper && pytest` passes
- [x] 2.2 Add a `SupabaseWriter` reconcile for `recent_set_cards` (read stored, delete obsolete, upsert added/changed; no write when unchanged) per design D3, and call it once per run in `scraper/run.py` next to the banlist refresh, best-effort with the chosen pair logged as `recent-sets: <CODE>, <CODE>`. Add writer and run tests with a fake session covering: first population, rollover to a new pair, repeat run issues no write, and an exception is logged without failing the scrape. Verify `cd scraper && pytest` passes

## 3. Frontend: data

- [x] 3.1 Extend `src/lib/trendingCards.ts` (optional `setCode` on the row/ranked types) and `src/hooks/useTrendingCards.ts` (third parallel call to `recent_set_top_cards` with the same resolved filters, skipped for `PREM`, exposed as `newCards`). Extend `src/hooks/useTrendingCards.test.tsx` and `src/lib/trendingCards.test.ts` to assert: the RPC receives the same slice parameters as `top_cards`, `PREM` makes no call and yields `[]`, rows rank by copies then decks then name to 10, and `setCode` is carried through. Verify `npm run test` and `npm run type-check` pass

## 4. Frontend: table and layout

- [x] 4.1 Add `showSet` to `TopCardsTable` (rank · card · set chip · copies, header row included), render the fourth table in `src/App.tsx` after Sideboard only when the format is not Pre-Modern, switch `.trending-layout` to two columns (stacking below 900px unchanged), add `trending.newCardsTitle` / `trending.newCardsEmpty` to `en.json` and `es.json`, and update the trending sentence in `src/content/legal/howItWorks.en.ts` / `.es.ts` to mention the new table. Extend `TopCardsTable.test.tsx` and `App.test.tsx` for: localized title, set-code chip text, no avg column, empty state, art preview on the name, table absent in Pre-Modern and present in the other four formats, DOM order Creatures → Spells → Sideboard → New Cards. Verify `npm run lint`, `npm run type-check`, `npm run test` pass and `src/locales/parity.test.ts` stays green

- [x] 4.2 Confine a Top New Cards RPC failure to that table (added after review): the hook catches the third call into `newCardsError` and an empty `newCards`, leaving `error` and the other three tables intact. Verify with a `useTrendingCards.test.tsx` case where only `recent_set_top_cards` fails, and `npm run test` / `npm run type-check` pass

## 5. Visual confirmation

- [ ] 5.1 Open the PR's Vercel preview and settle the items design.md marks pending: set-chip styling (reuse `CHIP_BASE` shape or not; neutral vs. neon tint), chip column placement, and empty-state wording; confirm the chip text clears 4.5:1 against its own background from the token ratios, and record the settled values in design.md
- [ ] 5.2 On the preview, confirm the 2x2 grid at desktop width (incl. Pre-Modern with Sideboard alone in row 2) and the stacked order at phone width, and that the wider existing three tables still read correctly

## Workflow follow-up

- User-visible change: open the PR and wait for Vercel preview confirmation before merging (CLAUDE.md exception 1).
- Apply the `schema.sql` additions in Supabase before the scraper change's first production run.
- Run `/opsx:verify`, then `/opsx:sync` and `/opsx:archive` after merge.
