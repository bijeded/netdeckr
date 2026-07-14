## Why

The short time frame is currently "Last 5 Days". A rolling 5-day window only reliably contains a full competitive weekend (RCQs, PTQs, large paper events) early in the week; by Thursday/Friday the previous weekend has fallen off the back and the window is dominated by the thinner MTGO league trickle. A rolling **7-day** window always contains exactly one full weekend on every day of the week, matching the natural weekly cadence of competitive Magic and giving the short view a stable, weekend-anchored signal.

## What Changes

- Rename the short time-frame window from **Last 5 Days** to **Last 7 Days** (label + logical key `5days` → `7days`), and extend its lookback from 5 to 7 days.
- **BREAKING (URL param):** the short window's URL value changes from `?w=5days` to `?w=7days`. Legacy `?w=5days` links SHALL be normalized to the new default (no error), so bookmarks/shares keep working.
- Update the default window (still the short one) to `7days`.
- Update bilingual (ES/EN) i18n labels: `windows.last5Days` → `windows.last7Days`.
- No change to the scraper, schema, retention, or data backfill — the short window is derived purely client-side by date-filtering the already-fetched 2-week corpus, which contains 7 days as a subset.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: the two time-frame options change from "Last 5 Days / Last 2 Weeks" to "Last 7 Days / Last 2 Weeks"; the short logical key becomes `7days` with a 7-day lookback; the default window becomes `7days`; and the URL fallback SHALL treat the retired `5days` value (alongside `2months`) as invalid and fall back to the default.

## Impact

- **Code:** `src/lib/windows.ts` (`WINDOWS`, `WINDOW_DAYS`, `DEFAULT_WINDOW`, `normalizeWindow` legacy handling), `src/locales/en.json` + `src/locales/es.json` (label key), and affected tests (`WindowSelector.test.tsx`, `useMetagame.test.tsx`, `App.test.tsx`, `windows`/`shareDelta` tests) plus any `5days` literals.
- **URL / users:** `?w=5days` links redirect to the default; `?w=7days` becomes canonical.
- **No impact:** scraper, Supabase schema, data pipeline, retention, share-delta logic (N derives from `WINDOW_DAYS`, comparing this-week vs last-week at N=7).
