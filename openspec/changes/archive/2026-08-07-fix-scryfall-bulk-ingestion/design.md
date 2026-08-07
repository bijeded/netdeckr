## Context

`scraper/scryfall.py` obtains the card index in three steps: `_default_fetch_meta()` GETs `api.scryfall.com/bulk-data`, `sync_bulk()` picks the `default_cards` entry and reads `entry["download_uri"]`, and `_default_download()` streams that URL to `scraper/.cache/scryfall/default_cards-<UTC date>.json`, which `load_bulk_index()` parses with `json.load` and hands to `CardIndex.from_bulk_rows`.

Scryfall's current metadata for `default_cards` is:

```json
{ "object": "bulk_data", "type": "default_cards",
  "uri": "https://api.scryfall.com/bulk-data/e2ef41e3-…",
  "jsonl_download_uri": "https://data.scryfall.io/default-cards/default-cards-20260806091027.jsonl.gz",
  "compressed_size": 77436806 }
```

Three things changed at once, and each independently breaks the current code:

| | before | now |
|---|---|---|
| metadata key | `download_uri` | `jsonl_download_uri` (`download_uri` absent → `KeyError`) |
| compression | uncompressed | gzip; served as `Content-Type: application/gzip` with **no** `Content-Encoding`, so `requests` does not transparently decompress |
| structure | one JSON array | one JSON object per line (JSONL) |

Verified against live Scryfall: the per-card record shape is unchanged — a decompressed first line yields the same `name`, `set`, `set_type`, `collector_number`, `image_uris`, `type_line`, `rarity`, `cmc`, `released_at`, `finishes`, `games`, `promo`, `variation`, `layout`, `lang` keys the selection heuristic already reads. So everything below `from_bulk_rows` — `_selection_key`, `_is_special_printing`, `_normalize`, `_name_keys`, image extraction — is untouched by this change.

The failure is invisible because `build_card_resolver()` (`scraper/run.py:41-53`) catches every exception and returns `None`, and `_deck_card_row` then omits the Scryfall columns entirely. Confirmed in the logs of all five of today's runs, every format:

```
[error] scryfall bulk sync: 'download_uri' (deck cards will be unenriched)
[error] PREM/archetype-art:   refresh_archetype_art requires a card_resolver
[error] PREM/archetype-color: refresh_archetype_color_identity requires a card_resolver
```

The Actions cache does not rescue this: the first failing run of a day populates cache key `scryfall-bulk-<date>` from an empty `scraper/.cache/scryfall` directory, so later runs get a cache *hit* that restores nothing and re-fail identically.

Production impact at time of writing: 42,438 / 159,378 `deck_cards` rows (27%) with null `image_url`, including the highest-id rows; ~14–50 archetypes per format with null `art_crop_url`. With 30-day retention, the enriched remainder ages out and the ratio trends to 100%.

## Goals / Non-Goals

**Goals:**
- Restore card enrichment against Scryfall's current bulk-data transport.
- Make a future upstream transport change fail in CI, not silently in production.
- Make a run that cannot enrich report failure rather than success.
- Repair the rows and archetypes left unenriched during the outage.

**Non-Goals:**
- Changing printing selection, name normalisation, or any resolution heuristic — the record shape is unchanged and those rules stay exactly as specified.
- Frontend work. `CardArtPreview` and `ArchetypeCard` already fall back correctly on a null URL, and stored `cards.scryfall.io` URLs still return 200.
- Schema changes.
- A general upstream-contract monitor. Failing loudly plus a fixture-backed test is the proportionate response here.

## Decisions

### Read `jsonl_download_uri`, and fail loudly if it is absent

`sync_bulk` already raises `RuntimeError` when no `default_cards` entry exists; extend the same treatment to a missing download URL, so the cause is named rather than surfacing as a bare `KeyError`.

Rejected: falling back across several candidate key names (`jsonl_download_uri`, then `download_uri`). Scryfall publishes one format at a time; a silent fallback chain is exactly the mechanism that let this outage hide. One key, one clear error.

### Stream gzip-JSONL; do not materialise the dataset

Replace `json.load(f)` with a generator that opens the file via `gzip.open(path, "rt", encoding="utf-8")` and yields `json.loads(line)` per non-empty line. `CardIndex.from_bulk_rows` already consumes any iterable of row dicts, so it needs no change.

This is also a substantial memory win, not just a compatibility fix: the decompressed dataset is on the order of 2 GB, and `json.load` had to hold the whole parsed array before indexing. Streaming keeps peak memory to the index itself and makes the scrape's footprint independent of Scryfall's dataset growth.

`_default_download` keeps writing raw response bytes to disk — the file stays gzipped at rest, which is what `gzip.open` wants, and keeps the cache at ~77 MB instead of ~2 GB. Because the server sends `Content-Type: application/gzip` and no `Content-Encoding`, `requests` passes the bytes through unmodified; no decompression happens at download time.

### Change the cache filename to `default_cards-<date>.jsonl.gz`

The extension is the format marker. A cache entry written by the current (broken) revision cannot be mistaken for a usable file, and `load_bulk_index` never has to sniff content.

Rejected: sniffing gzip magic bytes and dispatching to a JSON-array reader for backward compatibility. It preserves a code path nothing upstream produces, and the old fixture is being regenerated anyway.

Pair this with bumping the workflow cache key to `scryfall-bulk-v2-<date>`. Without the bump, the empty-directory cache entry already written under today's key would be restored on the day the fix ships, and the download would still be skipped for that day's remaining runs.

### `build_card_resolver` failure aborts the run

Keep `build_card_resolver` returning `None` on failure — the maintenance modes already branch on that and exit non-zero, and their tests assert it — but make the main scrape path do the same instead of constructing a writer with `card_resolver=None`:

```
formats = formats_to_scrape(argv, FORMATS)
resolver = build_card_resolver()
if resolver is None:
    print("Scryfall bulk sync unavailable; refusing to write unenriched decks", file=sys.stderr)
    return 1
writer = SupabaseWriter(url, key, card_resolver=resolver)
```

Checking before the format loop means no partially-unenriched write happens at all, and it makes the GitHub Actions run red — which is the actual point, since a green checkmark is what let this run undetected.

This is a deliberate reversal of the original "enrichment is optional, a Scryfall outage must not fail the scrape" stance. That trade was wrong in practice: unenriched rows are not degraded-but-fine, they are permanently art-less, because nothing in the daily loop re-enriches them and `--backfill-scryfall` is manual `workflow_dispatch` only. Skipping a day's scrape is cheap and self-correcting — the next run re-fetches the same two-week window. Writing null-enriched rows is not.

Rejected: keeping the run green and emitting a `::warning::` annotation. Warnings on a passing run are not looked at; that is how three weeks of this went unnoticed.

Rejected as out of scope: making the daily loop self-heal by running the backfill each night. Worth considering separately, but it would mask rather than fix the failure signal this change is establishing.

### Regenerate the bulk fixture as gzip-JSONL

`scraper/tests/fixtures/scryfall_default_cards_sample.json` is a JSON array, and `test_load_bulk_index_reads_a_file_into_an_index` reads it through the path being changed. Convert the same records to `scryfall_default_cards_sample.jsonl.gz`, keeping the card set identical so every resolution assertion keeps its meaning.

CLAUDE.md marks these fixtures as regenerate-deliberately; this qualifies, and the conversion is mechanical (same records, new container) rather than a re-scrape. Most tests in `test_scryfall.py` build indexes from inline dicts via `from_bulk_rows` and are unaffected.

Add a test asserting `sync_bulk` reads `jsonl_download_uri` — that is the regression test for this exact outage.

## Risks / Trade-offs

- **A Scryfall outage now stops the scrape.** Accepted, and the point of the change. Mitigated by the daily cache (a same-day rerun uses the cached file) and by the two-runs-per-day cadence with an incremental two-week window, so one skipped run loses nothing permanently.
- **Scryfall could change transport again.** Not preventable, but the fixture-backed `sync_bulk` test plus a red run means the next change is caught in CI or on the first scheduled run, not weeks later by eye.
- **`--backfill-scryfall` cost.** ~42k rows to re-resolve; it pages by id and PATCHes per distinct card name, so it is bounded by the distinct-name count, not the row count. Run it manually once via `workflow_dispatch` after the fix merges, and confirm the null count drops before considering the change done.
- **Archetype art needs a separate repair pass.** `refresh_archetype_art` runs per format inside the normal scrape, so the next successful scheduled run repairs archetypes on its own; only `deck_cards` needs the explicit backfill.
- **Cache-key bump costs one extra ~77 MB download** per format job on the day it ships. Negligible.
