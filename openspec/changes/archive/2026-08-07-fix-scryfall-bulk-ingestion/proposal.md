## Why

Scryfall changed its bulk-data distribution: the `default_cards` metadata entry no longer carries a `download_uri` key (it is now `jsonl_download_uri`), and the payload is a gzip-compressed JSONL stream rather than a plain JSON array. `sync_bulk` raises `KeyError: 'download_uri'` on every run as a result.

`build_card_resolver` catches that exception and returns `None` — by design, because enrichment was treated as best-effort — so every scheduled scrape since the upstream change has inserted `deck_cards` rows with null `image_url`/`scryfall_name` and skipped archetype art and colour identity, while the workflow still exits 0 and reports success. Production currently has 42,438 of 159,378 `deck_cards` rows (27%) with no image, including the most recently inserted rows, plus ~14–50 archetypes per format with no signature-card art. Because the pipeline prunes data older than 30 days, the enriched rows that remain are ageing out and the share of art-less cards trends toward 100% if this is not fixed.

## What Changes

- Read the bulk download URL from the current Scryfall metadata field instead of the removed `download_uri` key.
- Decompress and parse the bulk file in its current gzip-compressed JSONL form, streaming rather than loading the whole file into memory. The per-card row shape is unchanged, so printing selection, name normalisation and index construction are unaffected.
- Cache the bulk file under a name that reflects its actual encoding, so a cache entry written by an older revision is not mistaken for a usable file.
- **BREAKING (operational):** a scrape run that cannot build a card resolver SHALL fail loudly instead of silently writing unenriched rows. The scheduled workflow surfaces the failure rather than reporting success.
- Backfill the rows left unenriched while the sync was broken, using the existing `--backfill-scryfall` mode, and repair archetype art and colour identity for affected archetypes.
- Cover the new transport with scraper tests using a saved gzip-JSONL fixture, so a future upstream format change fails in CI rather than in production.

## Capabilities

### New Capabilities

None. This change repairs and hardens existing behaviour.

### Modified Capabilities

- `scryfall-card-mapping`: the bulk-sync requirement is restated so it does not depend on a specific upstream field name or file encoding, and it gains a requirement that an unavailable bulk index is a hard failure rather than a silent degradation.
- `metagame-data-pipeline`: the scheduled-execution requirement gains an explicit obligation that a run which cannot enrich cards fails visibly, so a green run means enrichment actually happened.

## Impact

- `scraper/scryfall.py` — `sync_bulk`, `_default_download`, `load_bulk_index`, cache key/filename.
- `scraper/run.py` — `build_card_resolver` error handling; the main scrape path's tolerance of a `None` resolver.
- `scraper/tests/` — new gzip-JSONL bulk fixture; existing bulk fixtures and their tests.
- `.github/workflows/scrape.yml` — Scryfall cache key (invalidated by the filename change).
- Production data — one `--backfill-scryfall` run plus archetype art/colour repair after the fix ships.
- No frontend change: `CardArtPreview`, `ArchetypeCard` and the hooks already degrade correctly on a null image URL, and stored image URLs still resolve.
- No schema change.
