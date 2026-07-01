## Context

Feature 1 ships a single implicit metagame window ("Last 2 Weeks", MTGTop8 `meta=50`). The data model reflects that: `metagame_snapshots` has PK `archetype_id` (one row per archetype) and freshness lives on `formats.last_updated_at` (one timestamp per format). This change turns the window into a first-class, user-selectable dimension backed by all five MTGTop8 `meta` params, which requires the snapshot table and freshness to become window-aware and the scraper to fetch each window.

Constraints (unchanged): browser is strictly read-only via RLS (anon SELECT only); writes only from the CI scraper with the service-role key; schema is applied manually (idempotent `supabase/schema.sql`), no migration tool; UI fully localized ES/EN; MTG proper nouns stay English. The five `meta` params are fixed and known: `50`, `326`, `52`, `46`, `285`.

## Goals / Non-Goals

**Goals:**
- Store a per-(format, window) archetype breakdown and freshness timestamp.
- Scraper fetches all five windows per format, replace-on-run per (format, window).
- One combined sidebar window selector; breakdown + freshness react to it.
- Window persisted in URL (`?w=`) alongside format (`?f=`), with safe fallback to default.
- Preserve today's default view (Last 2 Weeks) exactly.

**Non-Goals:**
- Event and archetype filters (deferred; separate change).
- Week-over-week deltas / snapshot history (schema stays current-only, replace-on-run).
- Two independent date/size axes — the source exposes a single `meta` dropdown, so we mirror it as one control.

## Decisions

### D1 — Window as a column with a fixed enum-like set, not a table
Add a `window` text column to `metagame_snapshots` and make the PK composite `(format_code, window, archetype_id)`. The five allowed values are validated by a CHECK constraint (`'50','326','52','46','285'`). Alternative — a `windows` lookup table — was rejected: the set is tiny, fixed, and defined by MTGTop8, so a lookup table adds joins with no benefit. Keeping `format_code` on the row (already present) preserves the fast `(format_code, window, rank)` read path.

### D2 — Freshness in a dedicated `format_window_freshness` table
Introduce `format_window_freshness(format_code, window, last_updated_at, PK(format_code, window))`. `formats.last_updated_at` is retained but no longer the source of truth for the indicator (kept to avoid a destructive column drop; the frontend reads the new table). Alternative — a per-window timestamp column array on `formats` — rejected as un-normalized and awkward to upsert per window.

### D3 — Snapshot rank/replace stays per (format, window)
The scraper's replace-on-run becomes scoped to `(format_code, window)`: delete that slice, re-insert ranked rows, then upsert the freshness row. A failure fetching one window leaves that window's prior slice and timestamp intact — other windows are independent. `archetypes` remains keyed by `(format_code, name)` and is shared across windows (an archetype can appear in several windows).

### D4 — Frontend: window in a typed constant + URL param `w`
Define the five windows as a typed constant (code, `meta` value, i18n label key, default flag) reused by the selector, the Supabase query filter, and URL (de)serialization. The breakdown hook keys its query on `(format, window)`. `w` is validated against the known set; absent/invalid → default `50`. Window state is preserved across format switches (independent URL params). Selector labels come from react-i18next; window option labels are localized while the concept "MTGO"/format names stay as-is per house style.

### D5 — Scraper loops windows, existing parser reused
The parser (`color_identity_for`, breakdown parsing) is window-agnostic and unchanged; only the fetch/orchestration loops over the five `meta` params per format and writes window-keyed slices. Tests add a fixture for at least one additional window to prove multi-window parsing/writing without live network.

## Risks / Trade-offs

- **5× the MTGTop8 requests per run (5 formats × 5 windows = 25 pages).** → Keep the existing respectful rate limiting/caching; the daily cadence and small page count keep this well within fair use.
- **Schema migration on a live table (PK change, new column).** → `schema.sql` is idempotent but the PK/column change on an existing DB is not a pure `create if not exists`; the migration must `alter`/backfill. Mitigation: write the migration to backfill existing rows with `window='50'` before adding the composite PK, and stamp existing `formats.last_updated_at` into `format_window_freshness` for window `50`. This is a manual, human-run step (service-role) per the handoff.
- **Empty windows early on.** Before the first multi-window scrape, only `50` has data; other windows show the existing empty state. → Acceptable and already specified; a full scrape backfills them.
- **URL now has two params.** → Both validated independently with fallback; no coupled state.

## Migration Plan

1. Update `supabase/schema.sql` (idempotent): add `window` column (default `'50'` for backfill), backfill existing rows, drop old PK, add composite PK `(format_code, window, archetype_id)` + CHECK on window, add `(format_code, window, rank)` index; create `format_window_freshness` with RLS read policy + grant; backfill it from `formats.last_updated_at` at window `50`.
2. Human applies the updated schema with the service-role key (assistant has anon only).
3. Ship scraper change; run `gh workflow run scrape.yml --ref main` (or wait for daily cron) to populate all windows.
4. Ship frontend behind the same PR flow; default view is unchanged until other windows are picked.
5. **Rollback:** revert frontend to ignore `w`; snapshots at window `50` remain valid, so the app degrades to the pre-change single-window behavior without data loss.

## Open Questions

- None blocking. (Whether to eventually drop `formats.last_updated_at` is deferred to a later cleanup to avoid a destructive change now.)
