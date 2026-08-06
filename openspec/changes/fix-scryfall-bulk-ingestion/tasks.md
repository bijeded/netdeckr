## 1. Test fixture

- [x] 1.1 Convert `scraper/tests/fixtures/scryfall_default_cards_sample.json` to `scryfall_default_cards_sample.jsonl.gz` — same card records, one JSON object per line, gzip-compressed — and delete the `.json` original
- [x] 1.2 Point `FIXTURE` in `scraper/tests/test_scryfall.py` at the new file and confirm `test_load_bulk_index_reads_a_file_into_an_index` is the only test that reads it directly

## 2. Bulk ingestion (TDD)

- [x] 2.1 Write a failing test: `sync_bulk` resolves the download URL from the `default_cards` entry's `jsonl_download_uri`
- [x] 2.2 Write a failing test: `sync_bulk` raises a named error when the `default_cards` entry has no `jsonl_download_uri`
- [x] 2.3 Write a failing test: `load_bulk_index` builds an index from a gzip-JSONL file, resolving a known card from the fixture
- [x] 2.4 Update `sync_bulk` to read `jsonl_download_uri` and raise `RuntimeError` naming the missing download location when absent
- [x] 2.5 Rewrite `load_bulk_index` to stream `gzip.open(path, "rt", encoding="utf-8")`, yielding `json.loads(line)` per non-empty line into `CardIndex.from_bulk_rows`
- [x] 2.6 Change the cache filename to `default_cards-<today>.jsonl.gz`; verify `_default_download` still writes raw response bytes (server sends `Content-Type: application/gzip` with no `Content-Encoding`, so no transparent decompression occurs)
- [x] 2.7 Update the existing cache-reuse and cache-absent tests for the new filename; confirm the full `pytest` suite passes

## 3. Fail loudly on a missing resolver

- [x] 3.1 Write a failing test in `test_run.py`: the main scrape path exits non-zero and constructs no writer when `build_card_resolver` returns `None`
- [x] 3.2 In `scraper/run.py`, resolve the card resolver before the format loop; on `None`, print an error naming the cause and `return 1` instead of constructing `SupabaseWriter(card_resolver=None)`
- [x] 3.3 Update the `build_card_resolver` docstring — enrichment is no longer best-effort for the scrape path — and confirm the maintenance-mode tests (`--backfill`, `--backfill-scryfall`, `--remap-scryfall`) still assert their existing non-zero exits

## 4. Workflow

- [x] 4.1 Bump the Scryfall cache key in `.github/workflows/scrape.yml` to `scryfall-bulk-v2-${{ steps.scryfall.outputs.date }}` so the empty-directory entry under the current key is not restored on the day the fix ships

## 5. Verify against live Scryfall

- [x] 5.1 Run `python scraper/run.py ST` locally against a real Scryfall sync and confirm the bulk file downloads, the index builds, and no `[error] scryfall bulk sync` line appears
- [x] 5.2 Confirm peak memory stays bounded during the index build (streaming, not a materialised 2 GB array)

## 6. Ship and repair production data

- [ ] 6.1 Open the PR; confirm `ci` passes (lint, type-check, `npm run test`, `pytest`)
- [ ] 6.2 After merge, trigger the `backfill-scryfall` mode via `workflow_dispatch` and confirm it exits successfully
- [ ] 6.3 Verify the `deck_cards` null-`image_url` count has dropped substantially from its 42,438 baseline (`?image_url=is.null` with `Prefer: count=exact`)
- [ ] 6.4 Let the next scheduled per-format runs complete, then verify archetype `art_crop_url` nulls have dropped from their baselines (ST 14/84, PI 20/91, MO 50/246, PAU 34/266, PREM 31/247) and that runs are green
- [ ] 6.5 Spot-check https://www.netdeckr.com — archetype card art, decklist hover art, and archetype mana pips all render
