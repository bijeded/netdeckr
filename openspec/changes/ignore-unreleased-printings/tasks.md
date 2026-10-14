# Tasks

## 1. Scraper: released-first printing selection

- [ ] 1.1 In `scraper/scryfall.py`, make "released by `today`" the leading component of the printing-selection key (released on or before `today`, or no `released_at`, outranks a later date; `today=None` applies no guard), thread `today` from `CardIndex.from_bulk_rows` into the ranking, and update the module docstring and ranking comments to name the new top priority. Add tests in `scraper/tests/test_scryfall.py` for each new spec scenario (unreleased reprint loses to the released printing, release status outranks treatment, a card printed only in an unreleased set still resolves, the release-day boundary picks the reprint) and confirm the existing ranking tests still pass. Verify with `cd scraper && pytest`.
- [ ] 1.2 Check that `sync_bulk` → `load_bulk_index` passes the run's date all the way to the ranking by asserting it in a `sync_bulk` test with a future-dated reprint in the fixture rows. Verify with `cd scraper && pytest`.

## Workflow follow-up

- Open the PR. The change only alters scraper-written data (Arena export set codes and card art for cards reprinted in a set still in preview), which a Vercel preview reading production data cannot show. Ask the user whether it falls under the user-visible merge exception before merging.
- `/opsx:sync`, then `/opsx:archive`.
