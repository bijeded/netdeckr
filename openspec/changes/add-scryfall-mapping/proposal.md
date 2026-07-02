## Why

`deck_cards.scryfall_name / set_code / collector_number` are always null — there is no Scryfall sync in the repo, so MTG Arena export falls back to raw scraped card names with no printing (set/collector). Scraped names can be split/DFC-truncated or spelled differently than Arena expects, so exports can fail to import cleanly. Mapping each scraped card to its canonical Scryfall printing fixes export fidelity and unblocks real card art later.

## What Changes

- Add a **Scryfall bulk-data sync** to the scraper: download Scryfall's `default_cards` bulk file once per day, cache it locally, and build an in-memory `name → canonical printing` index (canonical name, most-recent non-foil `set_code` + `collector_number`, `image_uris`). Respect Scryfall fair-use: hotlink images, cache the bulk file, no re-hosting.
- **Map cards at scrape time**: when writing `deck_cards`, resolve each scraped `card_name` against the index and populate `scryfall_name`, `set_code`, `collector_number` (leave null on a miss; export keeps its existing fallback).
- **One-time backfill**: map every existing `deck_cards` row that currently has null Scryfall columns, then map going forward on each scrape.
- Wire the bulk sync into the daily GitHub Actions pipeline (runs before the per-format scrapes so the index is warm).
- No frontend changes required — `useDeckCards` + `arenaExport.ts` already prefer `scryfall_name`/printing when present and fall back to `card_name`; this change simply makes those columns non-null.

## Capabilities

### New Capabilities
- `scryfall-card-mapping`: sync Scryfall bulk data, resolve scraped card names to canonical printings, and populate the `deck_cards` Scryfall columns (scrape-time + one-time backfill).

### Modified Capabilities
- `metagame-data-pipeline`: the decklist-writing behavior now enriches `deck_cards` with Scryfall printing data instead of leaving those columns null.

## Impact

- **Scraper:** new Scryfall bulk-sync + name-resolution module (`scraper/`), integrated into `SupabaseWriter.replace_deck_cards` (or the pipeline layer that calls it) and a backfill entry point in `run.py`. New pytest fixtures (a trimmed Scryfall bulk JSON sample). No new runtime dependency beyond `requests` (already present).
- **Pipeline:** `.github/workflows/scrape.yml` gains a bulk-download step; bulk file cached between the staggered per-format jobs.
- **Database:** no schema change — `deck_cards.scryfall_name / set_code / collector_number` already exist (nullable). Writes remain service-role only.
- **Frontend:** none (export/art path already reads these columns with a fallback).
- **External:** adds a daily dependency on Scryfall's bulk-data endpoint; must honor their rate-limit/caching guidance.
