## Why

The decklist scraper only reads the **first page** of each format's MTGTop8 events list, so most decks never make it into Supabase (≈1,439 decks stored vs. the full corpus). At the same time the scrape scope (three windows up to two months) is far too broad — a fully-paginated 2-month scrape would pull ~13.9k decks across formats in an hours-long run — and the database pointlessly retains six months of data. The result is an incomplete deck corpus that cannot support a trustworthy, deck-derived metagame later.

This change lands a **complete, correctly-scoped 2-week deck corpus**: it follows every page of the events list and narrows the scope to the two-week window (which contains the last-5-days data as a date subset). It is the prerequisite for the follow-up change (`derive-metagame-from-decks`) that will compute the metagame from these decks. The metagame breakdown stays snapshot-based here — no regression versus today, just more and cleaner data.

## What Changes

- Paginate event gathering: the decklist pass follows `&cp=2`, `&cp=3`, … for each format until a page yields no new events (with a safety page cap), deduping across pages and the incremental skip-set. Adds a `cp` param to the format-page URL builder.
- Add a saved page-2 MTGTop8 events-list HTML fixture and pagination/parser tests (fixtures only — never live network in CI).
- **BREAKING (UI):** narrow the time-frame filter from three windows to two — **Last 5 Days** and **Last 2 Weeks**; the **Last 2 Months** option is removed. An existing `?w=2months` link falls back to the default window without error.
- Scope the decklist scrape to the two-week window only (5-days is a date subset), and stop populating the `2months` metagame snapshot. The schema `meta_window` CHECK stays permissive (the snapshot/freshness tables are removed in the follow-up change — no throwaway migration here).
- Reduce decklist retention from six months to **30 days**; the daily prune drops the older long-tail on the next run.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: the scraper fetches **all pages** of a format's events list (not just the first); decklist scope narrows to the two-week window; the tracked logical windows drop to `5days` and `2weeks`; retention drops from six months to 30 days; fixtures additionally cover a paginated (page-2) events list.
- `metagame-breakdown-view`: the time-frame filter offers **two** windows (Last 5 Days, Last 2 Weeks) instead of three; the Last 2 Months option is removed and a `2months` window param falls back to the default.

## Impact

- **Scraper:** `scraper/mtgtop8.py` (`format_url` gains `cp`), `scraper/decklist_pipeline.py` (`sync_decklists` pagination loop), `scraper/run.py` (`RETENTION_DAYS` 182 → 30; decklist gathering window). New fixture under `scraper/tests/fixtures` + tests.
- **Frontend:** `src/lib/windows.ts` (WINDOWS/WINDOW_DAYS drop `2months`), `src/components/WindowSelector.tsx` + tests, any window-list tests.
- **Docs:** `CLAUDE.md` (Data pipeline: windows now 5days/2weeks, retention 30 days), `openspec/project.md` (retention line), `docs/HANDOFF.md` (scope/retention).
- **No schema migration** in this change (CHECK left permissive; snapshot/freshness tables removed in the follow-up `derive-metagame-from-decks`).
- **Data:** first post-merge daily run backfills the fuller 2-week corpus; the prune trims events older than 30 days.
