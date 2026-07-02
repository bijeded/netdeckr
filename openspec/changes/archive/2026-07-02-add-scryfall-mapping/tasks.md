## 1. Scryfall bulk sync + card resolver

- [x] 1.1 Add a trimmed `default_cards` bulk JSON fixture under `scraper/tests/fixtures` (a handful of cards incl. a split/DFC card, a digital-only printing, and a card with multiple paper printings) for offline tests.
- [x] 1.2 RED: write `scraper/tests/test_scryfall.py` covering (a) `CardIndex` build from bulk rows, (b) `resolve(name)` returns canonical name + non-foil `set_code` + `collector_number` for a known card, (c) split/DFC front-face name resolves to the full card, (d) unknown name returns `None`, (e) printing selection prefers most-recent non-foil paper printing and skips digital.
- [x] 1.3 GREEN: implement `scraper/scryfall.py` — `CardIndex.from_bulk_rows(rows)`, name normalization (lowercase, split/DFC/adventure front-face forms), `resolve(name) -> Printing | None`, and printing selection (most-recent non-foil, non-digital).
- [x] 1.4 RED: write tests for the bulk-sync/cache function (download-once-per-day; reuse today's cached file; download function is injected/mocked — never hits live Scryfall).
- [x] 1.5 GREEN: implement the bulk-sync/cache function (resolve `download_uri` from `/bulk-data`, stream to a date-keyed cache file, load + build index; reuse cache when fresh).

## 2. Enrich deck_cards at scrape time

- [x] 2.1 RED: extend `scraper/tests/test_decklist_writer.py` — `replace_deck_cards` with a resolver populates `scryfall_name`/`set_code`/`collector_number` for resolvable cards and leaves them null on a miss.
- [x] 2.2 GREEN: add an optional resolver to `SupabaseWriter.replace_deck_cards` (fill the three columns per card when it resolves); thread the built `CardIndex` through the pipeline/`run.py` so the daily scrape enriches new cards.

## 3. One-time backfill of existing rows

- [x] 3.1 RED: write tests for the backfill routine — pages `deck_cards` where `scryfall_name is null`, resolves, PATCHes resolvable rows, leaves misses null, and is idempotent (re-run is a no-op).
- [x] 3.2 GREEN: implement a `--backfill-scryfall` entry point in `scraper/run.py` (batch by PostgREST page, PATCH by id) reusing the resolver + index.

## 4. Pipeline wiring

- [x] 4.1 Add a bulk-download + `actions/cache` step to `.github/workflows/scrape.yml` (cache keyed on the UTC date so the file is downloaded once and reused across the staggered per-format jobs).

## 5. Verify + wrap up

- [x] 5.1 Run the one-time backfill with the service-role key and spot-check (read via anon key) that previously-null `deck_cards` rows now carry Scryfall identity; confirm Arena export shows `(SET) NUM` for resolved cards.
- [x] 5.2 Run the full suite (`npm run lint && npm run type-check && npm run test && cd scraper && ./venv/bin/pytest`).
- [x] 5.3 `/opsx:sync` deltas into `openspec/specs/`, then `/opsx:archive` the change (via a `chore:` PR since `main` is protected). Update `docs/HANDOFF.md`.
