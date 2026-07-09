## Why

`weight-power-score-by-tournament-size` records `events.player_count` at scrape time, but existing events all have it null — the incremental scraper skips already-stored events, and the decklist pass only walks events currently in the two-week window. So tournament-size weighting is uniform (all small-default) until sizes are populated. A one-time backfill re-parses stored event pages for their size so the weighting actually takes effect.

## What Changes

- Add a standalone **`--backfill-sizes`** maintenance mode (mirrors `--backfill-scryfall` / `--remap-scryfall` / `--refresh-color-identity`): it pages over stored `events` whose `player_count` is null, fetches each event page, parses the size with the existing `parse_event_size`, and PATCHes `player_count` when found. Misses stay null; decks/cards are never touched. It does not scrape decklists.
- Expose it as a `backfill-sizes` `workflow_dispatch` option in `.github/workflows/scrape.yml` (+ the matching `Resolve format` case arm), run once via `gh workflow run scrape.yml --ref main -f format=backfill-sizes`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: add a one-time event-size backfill mode that populates `player_count` on existing events from their event pages.

## Impact

- **Scraper:** `scraper/supabase_writer.py` (new `backfill_event_sizes` method), `scraper/run.py` (new `--backfill-sizes` arm), plus pytest.
- **CI:** `.github/workflows/scrape.yml` (`backfill-sizes` dispatch option + case arm).
- No schema, frontend, or dependency change. Read/patch only via the service-role key in CI; respectful rate-limiting reuses the existing scraper session.
