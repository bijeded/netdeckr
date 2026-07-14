## Context

The short time frame is a pure client-side date filter. `src/lib/windows.ts` is the single source of truth: `WINDOWS` (codes + i18n keys + default flag), `WINDOW_DAYS` (lookback in days), `DEFAULT_WINDOW`, and the `isWindowCode`/`normalizeWindow` guards. The scraper never sees the short code — it always gathers MTGTop8's 2-week window, and the frontend derives the short view by filtering decks whose `event_date` falls in the last N days. So this change is confined to the frontend config, i18n labels, and tests. No scraper, schema, retention, or backfill work.

There is precedent for retiring a window code: the `2months` value is already treated as invalid and falls back to the default in `normalizeWindow`.

## Goals / Non-Goals

**Goals**
- Short window = 7-day lookback, code `7days`, label "Last 7 days" / "Últimos 7 días".
- `7days` is the default window.
- Legacy `?w=5days` links resolve to the default without error (same treatment as `2months`).

**Non-Goals**
- No change to the 2-week window, share-delta math (N derives from `WINDOW_DAYS`), scraper, schema, or retention.
- No 301/redirect infrastructure — "resolve to default" is the existing `normalizeWindow` fallback, which the URL is then rewritten to reflect on next persist.

## Decisions

- **Rename the code, don't keep `5days` as an alias window.** `WINDOWS` and `WINDOW_DAYS` use `7days`; `5days` is removed from the valid set. This keeps exactly two live windows and avoids a dead code lingering in the type union.
- **Legacy fallback via the existing guard.** `normalizeWindow('5days')` returns `DEFAULT_WINDOW` (`7days`) because `5days` is no longer in `CODES`. No special-case branch is needed — the retired value falls through the same path as `2months`. A test SHALL pin this behavior explicitly.
- **i18n key renamed** `windows.last5Days` → `windows.last7Days` in both `en.json` and `es.json`, values "Last 7 days" / "Últimos 7 días". Renaming (not adding) avoids an orphaned key.
- **Default stays the short window.** `DEFAULT_WINDOW` becomes `7days`; `isDefault: true` moves to the `7days` entry.

## Risks / Trade-offs

- **Slightly slower reaction to bans / big events** — a 7-day window sheds old data two days later than 5. Mitigation: the 2-week window is the slow view anyway, and the short window's job is "stable recent signal," which 7 days serves better. Accepted.
- **Stale `?w=5days` bookmarks** silently land on the default rather than erroring. This is the intended, documented behavior and matches how `2months` was retired.

## Migration Plan

No data migration. On deploy, `?w=5days` requests fall back to `7days` via `normalizeWindow`; the URL is corrected on the next window persist. No coordinated scraper/schema step.

## Open Questions

None.
