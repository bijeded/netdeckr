<!--
Disciplined mode: each numbered group is one branch + one PR (TDD → subagent
code-review → PR → human merge). Recommended merge order: Group 1 → Group 2 → Group 3.
Group 2 (pagination) MUST also carry the two-week scoping — paginating the old
two-month scope is the ~13.9k-deck explosion this change avoids (design D2).
-->

## 1. Frontend: drop the Last 2 Months window

- [x] 1.1 Write/adjust tests first: `src/lib/windows.test.ts` (or the relevant suite) asserts `WINDOWS`/`WINDOW_DAYS` expose exactly `5days` and `2weeks`; `normalizeWindow('2months')` returns the default `5days`; `WindowSelector.test.tsx` asserts exactly two options render and no Last 2 Months option exists.
- [x] 1.2 Remove `2months` from `WINDOWS` and `WINDOW_DAYS` in `src/lib/windows.ts` (keep `5days` default; `normalizeWindow` already falls back for unknown/retired params).
- [x] 1.3 Update `src/components/WindowSelector.tsx` so it renders only the two remaining windows.
- [x] 1.4 Remove the now-unused `windows.last2Months` key from the `es` and `en` locale files.
- [x] 1.5 Run `npm run lint`, `npm run type-check`, `npm run test` — all green; confirm no other component references `2months`.

## 2. Scraper: paginate the events list, scope to two weeks, 30-day retention

- [x] 2.1 Add a saved page-2 events-list HTML fixture under `scraper/tests/fixtures` (captured deliberately from a live paginated `&cp=2` format page) plus a small no-new-events page fixture (or reuse an events page with only already-seen ids) for the stop condition.
- [x] 2.2 Write tests first: `format_url(fmt, meta, cp=2)` builds `...&meta=<id>&cp=2`; `parse_event_list` returns the page-2 fixture's events; the `sync_decklists` pagination loop follows subsequent pages, dedupes across pages + the skip-set, stops when a page yields no new events, and honors the safety page cap.
- [x] 2.3 Add an optional `cp` param to `format_url` in `scraper/mtgtop8.py`.
- [x] 2.4 Implement pagination in `scraper/decklist_pipeline.py::sync_decklists`: loop `cp=1,2,3,…`, accumulate/dedupe events, halt on a page with no new events or at the safety cap (~20); thread `cp` through the injected `fetch_format_page` closure in `scraper/run.py`.
- [x] 2.5 Scope decklist gathering to the two-week window only (drop `2months`, and drop the redundant `5days` pass since `2weeks` is its date superset) in `scraper/run.py` / `sync_decklists`.
- [x] 2.6 Stop populating the `2months` metagame breakdown: the breakdown pass runs `5days` + `2weeks` only (adjust the `WINDOWS` used by the breakdown pass; leave the schema CHECK permissive — no migration).
- [x] 2.7 Set `RETENTION_DAYS = 30` in `scraper/run.py` and confirm the prune uses the 30-day cutoff.
- [x] 2.8 Run `cd scraper && ./venv/bin/pytest` — all green, including the new pagination/fixture tests; confirm no test hits live network.

## 3. Docs

- [ ] 3.1 `CLAUDE.md` → Data pipeline: windows are now `5days`/`2weeks`, decklist scrape is paginated and scoped to the two-week window, retention is 30 days.
- [ ] 3.2 `openspec/project.md` → update the retention out-of-scope line (six months → ~1 month / 30 days).
- [ ] 3.3 `docs/HANDOFF.md` → note the two-window scope, pagination, and 30-day retention; flag that `derive-metagame-from-decks` is the queued follow-up.

## 4. Sync + archive (after all groups merged)

- [ ] 4.1 `/opsx:sync` the delta specs into `openspec/specs/metagame-data-pipeline` and `openspec/specs/metagame-breakdown-view`.
- [ ] 4.2 `/opsx:archive` the change (lands via a `chore:` PR since `main` is protected).
