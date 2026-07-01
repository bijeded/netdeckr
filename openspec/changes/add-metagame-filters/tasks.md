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

- [x] 4.1 Write failing component tests: selector renders the five localized options, selecting one updates the breakdown/freshness, window is preserved across format switch, reload/URL restores it, invalid `w` falls back to default
- [x] 4.2 Build the sidebar window selector component (design tokens/vibe; localized labels) and wire it to the window state + URL
- [x] 4.3 Run `npm run lint && npm run type-check && npm run test` — all green

## 5. Live verification (found a defect — see groups 6–8)

- [x] 5.1 Manually verify against live data. **FOUND:** MTGTop8 `meta` IDs are per-format, so hardcoding Standard's IDs made non-Standard formats store identical data across windows (filter dead for 4/5 formats). Also the windows aren't uniform across formats (Pre-Modern has no Large Events; MTGO is "Live Tournaments"/3mo elsewhere). Decisions: keep only the 3 universal date windows; `meta_window` becomes a logical key; default = Last 5 Days; build the real sidebar.

## 6. Data model → 3 universal logical windows (schema + scraper together)

- [ ] 6.1 Schema migration: change `metagame_snapshots`/`format_window_freshness` CHECK to logical keys (`5days`,`2weeks`,`2months`); set the column default to `2weeks`; one-time remap existing rows (`50→2weeks`, `326→5days`, `52→2months`) and delete the removed windows (`46`,`285`)
- [ ] 6.2 Scraper: define the 3 logical windows + a per-format `(logical window → MTGTop8 meta ID)` map; `run.py` resolves the format-specific meta ID when fetching and stores the logical key; update fixtures/tests; `pytest` green
- [ ] 6.3 Re-scrape (`gh workflow run scrape.yml`) and confirm each format now shows distinct data per window

## 7. Frontend: 3-window logical model + copy

- [ ] 7.1 Update `WINDOWS` to the 3 logical windows in order [`5days`,`2weeks`,`2months`], default `5days`; drop Large/MTGO; rename the filter heading to `filters.timeFrame` = "Time Frame"/"Periodo"; update ES/EN and remove dead keys
- [ ] 7.2 Update `useWindowSelection` default and the model/selector tests; `?w=` uses logical keys; App header pill/tests reflect default `5days`

## 8. Real filter sidebar (per design)

- [ ] 8.1 Rebuild the App layout as a full-height, flush-left 280px filter sidebar (border-right, own scroll) + independently scrolling main, per `design/MetaStack.dc.html`; host `WindowSelector`
- [ ] 8.2 Add the `≡` topbar toggle and mobile drawer behavior (sidebar collapses/overlays at ≤860px); component/App tests for the layout and toggle

## 9. Wrap-up

- [ ] 9.1 Re-verify against live data (each format switches windows; default Last 5 Days; sidebar renders per design; responsive)
- [ ] 9.2 `/opsx:sync` deltas into `openspec/specs/`, then `/opsx:archive`
