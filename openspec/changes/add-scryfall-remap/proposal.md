## Why

The two existing one-time passes only touch sentinel-null rows: `--backfill-scryfall` keys on `image_url is null` and `--backfill` keys on `type_line is null`. Once a row is fully enriched, a *later* resolver improvement — a better printing-quality heuristic, a name-matching fix, or new metadata — never reaches it. There is currently no way to propagate a resolver change to already-enriched deck cards short of wiping columns by hand.

## What Changes

- Add a one-time `--remap-scryfall` scraper mode that re-resolves **all** existing `deck_cards` rows against the current resolver (no null-sentinel filter), so resolver/printing/metadata heuristic changes reach existing data.
- Iterate over every distinct `card_name` in `deck_cards`; for each name that resolves now, PATCH all its rows, rewriting all Scryfall columns (`scryfall_name`, `set_code`, `collector_number`, `image_url`, `type_line`, `rarity`, `cmc`, `released_at`).
- **Never null-out existing data:** a name that misses (resolver returns None) is skipped entirely, leaving its columns untouched — a resolver regression can't wipe good rows.
- Always PATCH by distinct name (no compare-then-write); redundant identical writes are harmless. Idempotent — a deterministic resolver yields the same result on re-run.
- After the row pass, recompute every format's archetype signature card + art (reuse `_refresh_all_archetype_art`).
- Wire `--remap-scryfall` in `scraper/run.py` (mirrors `--backfill` / `--backfill-scryfall`: requires the resolver, standalone, does not scrape) and add a `remap-scryfall` option to `scrape.yml`'s `workflow_dispatch` so it runs in Actions with the service-role secret.

No schema change — all columns already exist.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `scryfall-card-mapping`: adds a full re-resolution (remap) of existing rows that, unlike the sentinel-keyed backfills, rewrites every distinct resolvable name's rows and skips misses (never nulling existing data).
- `metagame-data-pipeline`: adds the `--remap-scryfall` one-time maintenance mode (re-resolve all rows + recompute archetype art), runnable via `workflow_dispatch`.

## Impact

- Scraper: `scraper/supabase_writer.py` (new `remap_scryfall` method), `scraper/run.py` (new `--remap-scryfall` branch), tests.
- CI: `.github/workflows/scrape.yml` (`remap-scryfall` dispatch option → `run.py --remap-scryfall`).
- Data: an operator can run `remap-scryfall` after any resolver change to refresh existing rows; heavier than the backfills (touches every resolvable name, not just sentinel-null ones) but one-time and manual.
- No schema change; browser stays RLS read-only; writes remain service-role only.
