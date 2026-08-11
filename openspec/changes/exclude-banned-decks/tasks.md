## 1. Database schema

- [x] 1.1 Add `public.banned_cards` to `supabase/schema.sql` — `(format_code, card_name, first_seen_at date null)`, FK to `formats(code)`, unique on `(format_code, card_name)`, index on `card_name`; enable RLS, add the anon/authenticated `select` policy and grant, matching the existing tables' pattern. Idempotent (`if not exists` / `drop policy if exists`).
- [x] 1.2 Add an `illegal_deck_ids(p_format text, p_start date)` SQL function returning `bigint[]` (or a set of `bigint`) — the ids of decks in that format from `p_start` onward holding a `deck_cards` row whose `scryfall_name` matches a `banned_cards` row for the format. `security invoker`, `stable`, `set search_path = public`, granted to anon/authenticated.
- [x] 1.3 `create or replace` `top_cards` with the whole-deck `not exists` exclusion from design.md Decision 5. Signature and return columns are unchanged — do **not** drop and recreate. Keep the existing comment block accurate.
- [x] 1.4 Apply 1.1–1.3 to the Supabase project with the service-role key and confirm anon can read `banned_cards` and cannot write it.

## 2. Scraper — banned status from Scryfall

- [x] 2.1 In `scraper/scryfall.py`, read each bulk row's `legalities` map and expose per-card banned status for the five supported formats, resolved per card name alongside the existing printing selection. Missing or absent legality data yields banned-in-nothing (spec: "Missing legality information is not a ban").
- [x] 2.2 Map Scryfall's format keys (`standard`/`pioneer`/`modern`/`pauper`/`premodern`) to the DB format codes (`ST`/`PI`/`MO`/`PAU`/`PREM`) in one place, so the mapping cannot drift between modules.
- [x] 2.3 Add a `legalities`-bearing Scryfall bulk fixture under `scraper/tests/fixtures` and cover: banned surfaced per format, `restricted`/`not_legal`/`legal` not treated as banned, missing `legalities` yields no ban, and no network access during the test.

## 3. Scraper — banlist reconciliation

- [x] 3.1 In `scraper/supabase_writer.py`, add the per-format banlist reconcile: read the format's stored rows, insert additions, delete removals, leave unchanged rows (and their `first_seen_at`) alone. Store the canonical Scryfall name in `card_name`.
- [x] 3.2 Implement the seeding rule from design.md Decision 2 — when the format has **no** stored rows, write every row with `first_seen_at = null`; otherwise stamp only genuine additions with the run date. Condition is per format, so a format populated later seeds correctly too.
- [x] 3.3 Wire the reconcile into `scraper/run.py` after the Scryfall sync, and log the banned-card count found per format so a drop to zero is visible in the workflow output (design.md, Risks).
- [x] 3.4 Test the reconcile against a fake writer: first population writes all-null dates; a later run stamps only the new card; a repeat run over unchanged data is a no-op including dates; an unban deletes the row; a re-ban after an unban is dated again.

## 4. Frontend — corpus exclusion

- [x] 4.1 Add the banlist/illegal-deck data access (RPC call for the format + the same corpus fetch start date), returning the illegal deck id set and the format's newly-banned card names with their `first_seen_at`.
- [x] 4.2 In `useMetagame`, issue that call in parallel with `fetchCorpusDecks`, filter the fetched rows by the id set before anything downstream consumes them, and expose the count of rows removed from the currently displayed corpus. Do not modify `metagame.ts`, `powerScore.ts` or `shareDelta.ts` — the point of the design is that they stay unaware.
- [x] 4.3 Decide and implement the failure mode explicitly: a failed banlist call renders the unfiltered corpus rather than failing the dashboard (design.md, Risks), reporting no hidden decks.
- [x] 4.4 Test `useMetagame`: illegal decks absent from breakdown/shares/totals/filter options; an archetype whose every deck is illegal disappears; a partly-illegal archetype keeps only its legal decks in share and Power Score inputs; a format with no bans produces byte-identical output to before; a failed banlist call degrades to unfiltered.

## 5. Frontend — ban notice

- [x] 5.1 Build the notice component: names the newly banned cards, reports the hidden-deck count for the current view, states that the tiers and shares below exclude them, and offers dismissal. One component per file, PascalCase, tokens only, no hardcoded strings.
- [x] 5.2 Add ES/EN strings to `src/locales`, with card names left in English in both locales.
- [x] 5.3 Gate visibility on `first_seen_at` within 3 days (null never shows) and on a per-format `sessionStorage` dismissal, evaluating expiry before dismissal so an expired notice can never return.
- [x] 5.4 Mount it between the StatCard strip and the archetype grid.
- [x] 5.5 Test the notice: shown inside the 3-day window and not outside it; never shown for a null `first_seen_at`; per-format; dismissal holds across a format switch within the session; a fresh session shows it again; the count follows time-frame and filter changes; the zero-hidden-decks case still renders.

## 6. Verification

- [x] 6.1 Run the full suite — `npm run lint`, `npm run type-check`, `npm run test`, and `cd scraper && pytest`.
- [ ] 6.2 Check `top_cards` timing on the largest format (Modern or Pauper, 2-week window) with a non-empty banlist, against the same query with an empty one (design.md, Risks).
- [ ] 6.3 Confirm on the Vercel preview: the notice's visual treatment and copy, the grid with a real exclusion applied, and that the notice does not read as an error state. Record the settled visual values in design.md Decision 8, replacing the pending note.
- [ ] 6.4 This is a user-visible change — open the PR and wait for confirmation on the preview before merging (CLAUDE.md, exception 1).
