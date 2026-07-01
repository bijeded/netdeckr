## 1. Schema: window-aware snapshots + freshness

- [x] 1.1 Update `supabase/schema.sql` (idempotent): add `window text not null default '50'` to `metagame_snapshots`, backfill existing rows, drop the `archetype_id` PK and add composite PK `(format_code, window, archetype_id)`, add a CHECK constraint restricting `window` to `'50','326','52','46','285'`
- [x] 1.2 Replace the read index with `metagame_snapshots (format_code, window, rank)`
- [x] 1.3 Add `format_window_freshness(format_code, window, last_updated_at, PK(format_code, window))` with the anon SELECT RLS policy + grant, and backfill it from `formats.last_updated_at` at window `50`
- [x] 1.4 Document the migration/backfill order in `supabase/schema.sql` comments; verify the script parses (no local apply — service-role is a human step)

## 2. Scraper: fetch and store all five windows

- [x] 2.1 Add a saved MTGTop8 fixture for at least one non-`50` window under `scraper/tests/fixtures`
- [x] 2.2 Write failing tests: parser returns expected archetypes for the new-window fixture; the run orchestration fetches all five `meta` params per format and writes window-keyed slices; a single-window fetch failure leaves other windows intact (replace-on-run scoped to `(format, window)`)
- [x] 2.3 Define the five windows as a constant in the scraper and loop the fetch over `meta` params per format, building `http://mtgtop8.com/format?f=<code>&meta=<window>`
- [x] 2.4 Make the Supabase write replace-on-run per `(format_code, meta_window)` and upsert the `format_window_freshness` row on success; leave prior slice + timestamp intact on fetch/parse failure
- [x] 2.5 Run `cd scraper && ./venv/bin/pytest` — all green, no live network

## 3. Frontend: window model + data layer

- [x] 3.1 Add a typed `windows` constant (code, `meta` value, i18n label key, `isDefault`) and ES/EN label strings in `src/locales`
- [x] 3.2 Write failing tests for the breakdown hook/selector: query keyed on `(format, window)`, reads freshness from `format_window_freshness`, and returns loading/empty/error states per `(format, window)`
- [x] 3.3 Update the breakdown hook + Supabase query to filter by the selected window and read per-(format, window) freshness; make tests pass
- [x] 3.4 Add URL handling for `w`: validate against the known set, fall back to default `50`, and keep it independent from `?f=` (preserved across format switches)

## 4. Frontend: window selector UI

- [ ] 4.1 Write failing component tests: selector renders the five localized options, selecting one updates the breakdown/freshness, window is preserved across format switch, reload/URL restores it, invalid `w` falls back to default
- [ ] 4.2 Build the sidebar window selector component (design tokens/vibe; localized labels) and wire it to the window state + URL
- [ ] 4.3 Run `npm run lint && npm run type-check && npm run test` — all green

## 5. Wrap-up

- [ ] 5.1 Manually verify against live data on a preview deploy (all five windows switch; default is Last 2 Weeks; empty windows show the frowny state until backfilled)
- [ ] 5.2 `/opsx:sync` deltas into `openspec/specs/`, then `/opsx:archive`
