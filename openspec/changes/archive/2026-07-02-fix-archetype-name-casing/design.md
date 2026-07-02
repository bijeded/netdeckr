## Context

MTGTop8 capitalizes archetype names inconsistently across pages. The metagame breakdown page (`format?f=<code>&meta=<id>`) renders proper casing (`UW Control`, `BUG Control`, `UrzaTron`); the event decklist results table (`event?e=<id>`) title-cases the same label (`Uw Control`, `Bug Control`, `Urzatron`). Both parsers in `scraper/mtgtop8.py` extract the raw text via `.get_text(strip=True)` — neither transforms it — so the divergence is purely upstream.

The archetype table has `unique(format_code, name)` (case-sensitive). The scraper's get-or-create upserts by exact name, so a case-variant produces a **second archetype row**. That duplicate has no `metagame_snapshots` row (snapshots come only from the breakdown scrape, which uses the proper casing), so it never renders in the breakdown grid, and any decks attached to it are invisible.

Read-only audit (2026-07-02): 7 within-format normalized-name collision groups → 10 duplicate rows → ~30 stranded decks. The remaining ~216 decks under snapshot-less archetypes are legitimate long-tail archetypes (too rare for the breakdown), not this bug.

## Goals / Non-Goals

**Goals:**
- One archetype row per `(format, case-insensitive name)`; case variants can never split.
- Preserve a human-preferred display name (favor the breakdown-page casing, which players read).
- Merge existing duplicates and re-point their decks/snapshots — no data loss.
- Reproduce-first: a failing scraper test from a saved event-page fixture before the fix.

**Non-Goals:**
- Fuzzy/semantic archetype de-duplication (e.g. `Izzet Murktide` vs `UR Murktide`). Only pure case variants are in scope.
- Backfilling Scryfall card data (separate change).
- Any frontend change — reads self-correct once duplicates merge.

## Decisions

1. **Canonical matching in the scraper (case-insensitive get-or-create).** The archetype upsert matches on `lower(name)` within a format. On first sight, store the name as scraped; do not overwrite the stored display name on later case-variant hits (first writer wins). Because the breakdown scrape runs and is the source of snapshots, prefer seeding archetypes from it; the decklist scrape then matches case-insensitively into the existing row.

2. **Schema enforces it — functional unique index.** Replace/augment `unique(format_code, name)` with a unique index on `(format_code, lower(name))`. This is the real guard: even if scraper logic regresses, the DB rejects the duplicate. Chosen over `citext` to avoid adding an extension dependency; a `lower()` expression index is standard PostgreSQL. Applied via `supabase/schema.sql` (idempotent) + a migration block; validate with **pglast** (not sqlglot — it misses expression-index/reserved-word issues, per the `placing`→`placement` lesson).

3. **One-time merge migration.** For each `(format_code, lower(name))` group with >1 row: pick the canonical row (the one carrying `metagame_snapshots`, else the lowest id / breakdown casing), re-point `decks.archetype_id` and `metagame_snapshots.archetype_id` to it, then delete the orphan rows. Idempotent and safe to re-run. Runs before the unique index is added (or the index add would fail on existing dupes). Requires the service-role key — a human/CI step, documented in tasks.

4. **Reproduce with a fixture.** Save an MTGTop8 event page whose results table title-cases an archetype that the breakdown spells differently. Failing test asserts the scraped decklist archetype name resolves to the same canonical archetype as the breakdown. Then implement.

## Risks / Trade-offs

- **Display-name flapping:** if the decklist scrape seeds an archetype before the breakdown scrape (ordering), the stored casing could be the title-cased variant. Mitigation: first-writer-wins keeps it stable, and the breakdown scrape's proper casing is preferred by running/seeding it first; acceptable since casing is cosmetic and the merge picks breakdown casing.
- **Migration ordering:** the unique index cannot be added while duplicates exist — merge must run first. Tasks sequence this explicitly.
- **Expression unique index + upsert:** PostgREST `on_conflict` upserts must target the expression index correctly (or the scraper does explicit select-then-insert). Verify the upsert path against the functional index.
- **Re-scrape not required** to fix existing data (the merge handles it), but future scrapes now converge; a re-scrape would simply be a no-op for dedup.
