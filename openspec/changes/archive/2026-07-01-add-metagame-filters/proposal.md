## Why

Today the dashboard shows a single, implicit metagame window ("Last 2 Weeks"). Professional players need to compare the metagame across different sample periods and event scopes (last 5 days, last 2 months, large paper events, MTGO), and casual players still want the same quick default view. MTGTop8 already exposes these as its `meta` param, so we can surface them as a first-class filter.

## What Changes

- Add a sidebar **time window / scope** selector exposing the five MTGTop8 `meta` options as one combined control: Last 2 Weeks (`50`, default), Last 5 Days (`326`), Last 2 Months (`52`), Large Events 2mo (`46`), MTGO 2mo (`285`) — labels localized ES/EN.
- The breakdown grid, ranks, shares, and "Updated X ago" indicator update to the selected format + window's stored snapshot.
- The selected window persists in the URL alongside format (e.g. `?f=ST&w=50`); invalid/missing `w` falls back to the default. The selected window is preserved when the format changes.
- Reuse the existing loading / empty / error states for format+window combinations with no data.
- **BREAKING (data model):** the daily pipeline fetches and stores all five windows per format; `metagame_snapshots` is keyed by `(format_code, window, archetype_id)` and freshness becomes per-(format, window) instead of a single `formats.last_updated_at`. Requires a deliberate migration to `supabase/schema.sql`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds the window/scope filter, its URL persistence and default, window-preservation across format switches, and per-window freshness/empty/loading/error behavior.
- `metagame-data-pipeline`: scraper fetches each of the five `meta` params per format and writes per-(format, window) replace-on-run snapshots with per-window freshness.

## Impact

- **Schema:** `supabase/schema.sql` — `metagame_snapshots` composite PK gains `window`; per-(format, window) last-updated timestamp. Deliberate migration.
- **Scraper:** `scraper/mtgtop8.py` / run logic — loop over the five `meta` params per format; write window-keyed snapshots.
- **Frontend:** breakdown hook/selectors (Supabase read filtered by window), new sidebar window selector component, URL param handling (`w`), i18n strings (ES/EN), freshness read per window.
- **Tests:** frontend unit/integration for the selector, URL persistence, default/fallback, empty/loading/error per window; scraper tests (fixtures per meta param) for multi-window fetch/write.
