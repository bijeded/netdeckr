# Tasks

Fast mode: all tasks on one branch, single PR.

## 1. Writer methods

- [x] 1.1 TDD `events_missing_size(page_size=1000)` in `SupabaseWriter`: cursor-paged GET on `events?player_count=is.null&select=id,source_event_id,format_code`; returns the rows. Test the null-filter + paging.
- [x] 1.2 TDD `set_event_size(event_id, size)`: PATCH `events?id=eq.<id>` with `{ "player_count": size }`. Test the URL + body.

## 2. Backfill orchestration

- [x] 2.1 TDD `backfill_event_sizes(writer, fetch_event_page, on_error=None) -> int` in `scraper/decklist_pipeline.py`: for each null-size event, fetch its page, `parse_event_size`, `set_event_size` when found; count updates; per-event try/except so one failure doesn't abort. Tests with a mock writer + fetcher (no network) covering: fills a found size, skips a miss, one-error-continues, returns the update count.

## 3. Run mode + CI wiring

- [x] 3.1 Add a `--backfill-sizes` arm in `scraper/run.py` (standalone, no Scryfall resolver) that calls `backfill_event_sizes(writer, fetch_event)` and prints the count; add it to the module docstring's mode list.
- [x] 3.2 Add `backfill-sizes` to `.github/workflows/scrape.yml` `workflow_dispatch` format options and the `Resolve format` case arm (so an unmapped option still fails loudly).

## 4. Verify

- [x] 4.1 `cd scraper && ./venv/bin/pytest` all green.
- [ ] 4.2 Then (post-merge, manual): `gh workflow run scrape.yml --ref main -f format=backfill-sizes`; confirm live that `events.player_count` is populated and re-verify tier distribution now reflects real sizes.
