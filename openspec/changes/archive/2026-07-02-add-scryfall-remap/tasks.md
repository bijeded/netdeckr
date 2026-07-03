# Tasks

Disciplined mode. One cohesive PR (scraper + workflow, no schema change).

## 1. `--remap-scryfall` mode (one PR)

- [x] 1.1 (TDD) `scraper/supabase_writer.py`: add `remap_scryfall(self, *, page_size=1000) -> int`. Page `deck_cards` by ascending id selecting `id,card_name` with NO null-sentinel filter; collect the distinct `card_name` set. For each name that resolves, PATCH `?card_name=eq.<quote(name, safe='')>` (no sentinel filter) with all eight columns (scryfall_name, set_code, collector_number, image_url, type_line, rarity, cmc, released_at); skip misses (no PATCH). Return rows updated. Requires a card_resolver (raise otherwise). Tests: resolvable names rewrite all their rows including already-enriched ones; a miss is skipped (no PATCH, existing data untouched); name percent-encoded and not double-quoted; no `=is.null` in the read or PATCH URLs; empty table is a noop; requires-resolver raises.
- [x] 1.2 (TDD) `scraper/run.py`: add a `--remap-scryfall` branch (distinct exact-membership check alongside `--backfill` / `--backfill-scryfall`). Build the resolver (return 1 if unavailable), construct the writer, call `remap_scryfall`, print the count, then `_refresh_all_archetype_art(writer)`; do NOT scrape; return 0. Update the module docstring usage examples. Tests: `--remap-scryfall` calls `remap_scryfall` + `refresh_archetype_art` per format and does not call `sync_all`; fails (rc 1) when bulk sync is unavailable.
- [x] 1.3 `.github/workflows/scrape.yml`: add a `remap-scryfall` option to the `workflow_dispatch` format choice and a `remap-scryfall)` case in the Run step routing to `python scraper/run.py --remap-scryfall`. Verify YAML parses; confirm scheduled runs are unaffected.
- [x] 1.4 Run `cd scraper && ./venv/bin/pytest`. Code-review subagent (clean context) over the diff; address findings. Then github-pr.

## 2. Post-merge (operator, service-role)

- [ ] 2.1 After merge, when a resolver heuristic actually changes: Actions → run `scrape.yml` with format `remap-scryfall` (or `gh workflow run scrape.yml -f format=remap-scryfall`); note the rows-updated + per-format archetype-art counts.
- [x] 2.2 After all tasks: `/opsx:sync` deltas into `openspec/specs/`, then `/opsx:archive` (chore PR). Update `docs/HANDOFF.md` (mark deferred item #2 done).
