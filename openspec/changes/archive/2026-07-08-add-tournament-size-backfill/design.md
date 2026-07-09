## Context

`events.player_count` is written at scrape time (`weight-power-score-by-tournament-size`), but existing rows are null: the decklist pass skips already-stored events (`skip_event_ids`) and only walks the current two-week window. A one-time pass must re-visit stored events and fill their size from the event page. The building blocks already exist: `parse_event_size(html)` (mtgtop8), `fetch_event(fmt, event_id)` (run.py), and the writer's PostgREST session + cursor-paging pattern (see `backfill_scryfall`).

## Goals / Non-Goals

**Goals:**
- Populate `player_count` on stored events that have it null, from their event pages.
- Reuse `parse_event_size` and the injected-fetcher testing pattern; no schema/frontend change.
- Idempotent and safe to re-run: a miss leaves the row null (revisited next run); a found size is written once.

**Non-Goals:**
- No re-fetch of decklists/cards (this only touches `events.player_count`).
- No change to the daily scrape flow, tiers, or frontend.
- Not backfilling events that legitimately report no size (they stay null forever — correct).

## Decisions

### 1. Orchestrate in `decklist_pipeline`, mirror `sync_decklists`
Add `backfill_event_sizes(writer, fetch_event_page, on_error=None) -> int`: pull the null-size events from the writer, fetch each event page, `parse_event_size`, and update when found. Injected `fetch_event_page` keeps it unit-testable with a mock fetcher (no network), consistent with `sync_decklists`. A per-event try/except means one bad event doesn't abort the pass.

### 2. Two thin writer methods
- `events_missing_size(page_size=1000) -> list[dict]`: cursor-paged GET on `events?player_count=is.null&select=id,source_event_id,format_code` (same paging shape as `backfill_scryfall`).
- `set_event_size(event_id, size) -> None`: PATCH `events?id=eq.<id>` with `{ "player_count": size }`.

### 3. `--backfill-sizes` run mode + workflow option
A standalone arm in `run.py` (like the other one-time modes) that builds the writer and calls `backfill_event_sizes(writer, fetch_event)`; prints the count. Add `backfill-sizes` to `scrape.yml`'s `workflow_dispatch` format options and the `Resolve format` case, so it runs as `gh workflow run scrape.yml --ref main -f format=backfill-sizes`. No Scryfall resolver needed (size comes from the event page, not cards).

## Risks / Trade-offs

- **Fetch volume:** one event-page GET per null-size event (~hundreds, once). The existing `REQUEST_DELAY_SECONDS` rate-limit applies — respectful, but the run takes a few minutes. Acceptable for a one-time pass; subsequent daily runs write size on new events only.
- **Events with no reported size stay null forever** and are re-fetched on every future backfill run. That's fine (backfill is one-time/manual), and the frontend treats null as the small-event default. If wasteful later, a "tried, no size" sentinel could skip them — out of scope now.
- **Mixed formats in one pass:** `events_missing_size` returns the format per row so `fetch_event` builds the right URL; no per-format loop needed.
