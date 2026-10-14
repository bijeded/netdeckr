# Tasks

## 1. Database index

- [x] 1.1 Add `create index if not exists deck_cards_scryfall_name_idx on public.deck_cards (scryfall_name, deck_id);` to `supabase/schema.sql` beside the other `deck_cards` indexes, with a comment naming the lookups it serves (legality in `top_cards` / `recent_set_top_cards` / `illegal_deck_ids`, recent-set join) and the measured before/after. Verify the script stays idempotent by checking the new statement uses `if not exists` and that no other statement changed (`git diff supabase/schema.sql`).

- [x] 1.2 Rewrite the legality filter in `top_cards`, `recent_set_top_cards` (`d.id not in (...)`, hashed SubPlan) and `illegal_deck_ids` (`d.id = any(array(...))`) per design decision 1b, keeping signatures and results. Update the comments that describe the filter, and keep the two trending functions' filter blocks in sync. Verify after the user applies the functions: each still returns the same rows as before for MO 2 weeks (row counts match), and a forced-generic-plan EXPLAIN shows the SubPlan/InitPlan over `deck_cards_scryfall_name_idx`.

## 2. Error reporting helper

- [x] 2.1 Add `captureError(error, context)` to `src/lib/sentry.ts`: dynamically import `@sentry/react`, wrap non-`Error` values (Supabase `{ code, message }`) in an `Error` whose message carries the code, attach `context` as tags/extra, and swallow import failures. Switch `ErrorBoundary` to it, keeping its console mirror. Verify with a unit test (mocked `@sentry/react`) covering an `Error`, a Supabase-shaped object and a failed import, and that `ErrorBoundary.test.tsx` still passes.

## 3. Trending hook reports failures

- [x] 3.1 In `useTrendingCards`, call `captureError` once when the main/side load fails (with format, window and RPC) and once when the Top New Cards call fails, without changing the returned state. Verify with tests in `useTrendingCards.test.tsx`: a `top_cards` error reports once and sets `error`; a `recent_set_top_cards` error reports once, sets `newCardsError` and leaves the other tables populated; a successful load reports nothing.

## 4. Trending error state in the UI

- [x] 4.1 Add `trending.loadError` to `src/locales/en.json` and `src/locales/es.json`. In `App.tsx`, pass it to Top Creatures, Top Spells and Top Sideboard Cards when the hook's `error` is set, and to Top New Cards when `error` or `newCardsError` is set, in place of each table's empty message. Verify with `App.test.tsx` cases: `error` set → three tables (and New Cards) show the error text, not the empty text; only `newCardsError` set → New Cards shows the error and the other three show their rows; no error with empty arrays → the empty texts still show. Verify `src/locales/parity.test.ts` passes.

## 5. Integration

- [x] 5.1 Run `npm run lint`, `npm run type-check` and `npm run test` and verify all pass.
- [x] 5.2 Open the PR and stop: it is user-visible (CLAUDE.md exception 1). Verify on the Vercel preview that the trending section renders unchanged on a healthy load, and record whether the error text needs its own visual treatment (design decision 2, pending visual confirmation).
- [x] 5.3 After the user applies the index in production (design Migration Plan step 2), time `top_cards` main/side and `recent_set_top_cards` for MO and PAU at 2 weeks with the anon key, fired concurrently. Verify every call returns 200 under the 3s timeout with headroom, and that Modern 2 weeks shows all four tables.

## Workflow follow-up

- Run `/opsx:verify`, then `/opsx:sync` and `/opsx:archive` once the PR is merged and the index is live.
