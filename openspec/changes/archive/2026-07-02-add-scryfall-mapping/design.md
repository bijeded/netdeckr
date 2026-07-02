## Context

The scraper writes `deck_cards` with only the raw MTGTop8 card name; the `scryfall_name`, `set_code`, and `collector_number` columns exist (nullable) but are never populated. MTG Arena export (`src/lib/arenaExport.ts` + `useDeckCards`) already prefers the Scryfall identity and falls back to the scraped name, so the missing piece is purely on the data-pipeline side. The scraper is Python 3.12, dependency-light (`requests` + BeautifulSoup4, raw PostgREST via `SupabaseWriter`, no `supabase-py`), tested against saved fixtures, and orchestrated by a pure `pipeline.py` with I/O injected. The daily GitHub Actions workflow runs one staggered job per format.

## Goals / Non-Goals

**Goals:**
- Sync Scryfall `default_cards` bulk data once/day, cached, fair-use compliant (hotlink images, no re-host, no per-card API calls).
- Resolve scraped card names → canonical Scryfall printing (name + non-foil set_code + collector_number), tolerating split/DFC naming.
- Populate `deck_cards` Scryfall columns at scrape time and via a one-time backfill of existing null rows.
- Keep the scraper dependency-light and fixture-testable; never hit live Scryfall in CI.

**Non-Goals:**
- No schema change (columns already exist).
- No card-art rendering in the frontend (a later change; this only stores the printing/image reference).
- No "special art"/foil selection — current non-foil printing only.
- No change to the Arena export logic itself (it already reads these columns).

## Decisions

- **Bulk file over per-card API.** Download the `default_cards` bulk export (via Scryfall's `/bulk-data` metadata endpoint → `download_uri`) once/day and index in memory. Alternative (per-card `/cards/named`) rejected: thousands of distinct cards × daily = abusive and slow; bulk is the guideline-sanctioned path.
- **Cache keyed by date.** Store the bulk file under a cache dir (e.g. `scraper/.cache/scryfall/default_cards-YYYY-MM-DD.json`); if today's file exists, reuse it. The GH Actions job downloads once and the file is reused across the staggered per-format jobs (cache the dir via `actions/cache`, keyed on the UTC date).
- **Resolver module, injected like the writer.** A new `scryfall.py` exposes a small `CardIndex` (build from bulk rows → `{normalized_name: printing}`) with a `resolve(name) -> Printing | None`. Name normalization lowercases and handles split/DFC/adventure forms: index each card under its full name **and** its front-face/first-half name so a scraped `"Fable of the Mirror-Breaker"` or `"Fire"` (from `Fire // Ice`) resolves. On ambiguity or miss → `None`.
- **Choosing the printing.** Prefer the card's most-recent non-foil, non-digital paper printing (highest `released_at`), skipping funny/oversized sets. Scryfall bulk rows carry `set`, `collector_number`, `released_at`, `nonfoil`, `digital`, `image_uris`. Store `set` (uppercased to match Arena's `(SET) NUM` convention) and `collector_number`.
- **Enrichment at the writer seam.** `SupabaseWriter.replace_deck_cards` gains an optional resolver; when present it fills the three columns per card. The pipeline passes the index in. A miss leaves columns null (export fallback still works).
- **Backfill as a separate `run.py` entry point** (e.g. `python run.py --backfill-scryfall`): page through `deck_cards` where `scryfall_name is null`, resolve, and PATCH in batches. Idempotent (only touches null rows; re-running is a no-op once populated).

## Risks / Trade-offs

- **Bulk file is large (~100–500 MB).** → Stream the download to disk; build the index by parsing once; only keep the trimmed `{name: printing}` map in memory, not the raw JSON. Cache between jobs so it's downloaded once/day.
- **Name-match false positives (wrong split/DFC or reprint).** → Only index deterministic front-face/full-name forms; on any ambiguity return `None` (miss) rather than guessing. A null column is safe — export falls back to the scraped name.
- **Scryfall schema drift (field names).** → Isolate all field access in `scryfall.py`; fixture-test against a trimmed real bulk sample so drift surfaces as a test failure.
- **Backfill volume / PostgREST paging.** → Batch by page (respect the 1000-row cap), PATCH by primary key; safe to resume since it filters on `scryfall_name is null`.
- **CI must never hit live Scryfall.** → Sync/resolver tests use a saved trimmed bulk JSON fixture under `scraper/tests/fixtures`; the download function is injected/mocked.

## Migration Plan

1. Merge scraper change (sync + resolver + writer enrichment + backfill entry point) — no schema migration needed.
2. In CI/locally with the service-role key, run `python run.py --backfill-scryfall` once to populate existing rows.
3. Add the bulk-download + `actions/cache` step to `scrape.yml`; the next daily run enriches new cards going forward.
4. Rollback: the columns are nullable and additive — reverting the scraper simply stops populating them; existing values remain valid. No data loss.

## Open Questions

- Where to run the one-time backfill (local with service-role key vs. a one-off `workflow_dispatch` job)? Default: local/CI manual step, consistent with prior schema-apply steps.
