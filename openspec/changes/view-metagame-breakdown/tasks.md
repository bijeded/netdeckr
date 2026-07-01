## 1. Database schema & RLS

- [x] 1.1 Write `supabase/schema.sql` defining `formats` (code PK, name, last_updated_at), `archetypes` (id, format_code FK, name, color_identity, unique(format_code,name)), and `metagame_snapshots` (archetype_id FK, format_code, share_pct, rank)
- [x] 1.2 Seed the 5 `formats` rows (ST/PI/MO/PAU/PREM) with display names in the schema (or a seed script)
- [x] 1.3 Add RLS policies: enable RLS on all three tables, grant `select` to the anon role, no insert/update/delete for anon
- [x] 1.4 Apply the schema to the Supabase project and verify anon can read and cannot write (manual + note in PR)

## 2. Scraper — parsing (TDD, fixtures only)

- [x] 2.1 Save a real MTGTop8 `meta=50` breakdown HTML fixture per representative format under `scraper/tests/fixtures/`
- [x] 2.2 Write failing tests for `parse_meta_breakdown(html)` asserting archetype name, share %, and color identity from the fixtures
- [x] 2.3 Implement `parse_meta_breakdown` in `scraper/mtgtop8.py` (pure function, no network) until tests pass
- [x] 2.4 Add a helper to assign `rank` by descending share and normalize color identity (missing/unknown → colorless `''`), with tests

## 3. Scraper — pipeline & upsert

- [x] 3.1 Add the Supabase write client to the scraper (service-role key from env) in `scraper/run.py`
- [x] 3.2 Implement per-format fetch → parse → replace-on-run upsert (delete format's snapshot rows, upsert archetypes, insert ranked snapshots) inside a per-format transaction
- [x] 3.3 Stamp `formats.last_updated_at` only after a successful insert; on fetch/parse failure leave prior data and timestamp unchanged
- [x] 3.4 Add a test/mocked check that a source failure for one format does not wipe its stored data
- [x] 3.5 Run `run.py` manually against Supabase to seed all 5 formats and confirm rows land

## 4. Daily pipeline wiring

- [x] 4.1 Add/confirm the GitHub Actions daily cron workflow invokes `scraper/run.py` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` secrets
- [x] 4.2 Ensure scraper deps are installed in the workflow and its pytest suite runs in CI

## 5. Frontend — data & format state

- [x] 5.1 Add a typed `useMetagameBreakdown(formatCode)` hook that reads `metagame_snapshots` joined to `archetypes`, ordered by rank, limited to 20, returning `{ data, loading, error }`
- [x] 5.2 Add a `useFormatSelection` hook backing the active format on the `?f=` URL param, defaulting to Standard and validating the code
- [x] 5.3 Add a read for the selected format's `last_updated_at` and a localizable "Updated X ago" helper (Intl.RelativeTimeFormat)
- [x] 5.4 Unit-test the hooks' selection/limit/default/validation logic

## 6. Frontend — components (ported from design/)

- [x] 6.1 Port `ManaPip`/`ManaPips` to React + TS (WUBRG order, up to 5; colorless → one gray pip) with tests
- [x] 6.2 Port `ArchetypeCard` (rank zero-padded, English name, mana pips, placeholder gradient art, one-decimal mono share %) with tests
- [x] 6.3 Port the format switcher (`Pill`s for the 5 formats) wired to `useFormatSelection`
- [x] 6.4 Add `Spinner` and `EmptyState` (centered frowny-face message) components

## 7. Frontend — dashboard assembly & i18n

- [ ] 7.1 Assemble the dashboard: format switcher + freshness indicator + top-20 archetype grid (`repeat(auto-fill,minmax(248px,1fr))`)
- [ ] 7.2 Wire loading → spinner, no-data/error → EmptyState, success → grid
- [ ] 7.3 Add ES/EN i18n keys for all new copy (no hardcoded strings); keep archetype names in English
- [ ] 7.4 Apply design tokens (import `design/tokens` or mirror into `src` styles) for the dark violet-neon theme and fonts

## 8. Verification

- [ ] 8.1 Verify each acceptance scenario against seeded data (top-20 cap, colorless pip, default Standard, switch, reload persistence, freshness, loading/empty/error)
- [ ] 8.2 Confirm lint, type-check, frontend tests, and scraper pytest all pass locally and in CI
- [ ] 8.3 Verify on a Vercel preview deployment against real Supabase data
