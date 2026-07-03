## Context

The scraper enriches `deck_cards` from Scryfall at scrape time, plus two one-time passes: `backfill_scryfall` (keyed on `image_url is null`) and `backfill_metadata` (keyed on `type_line is null`). Both use a null column as a completeness sentinel, so once a row is fully enriched they never revisit it. That is correct for filling gaps but means a *later* resolver improvement (better printing selection, a name-matching fix, new metadata) can't reach already-enriched rows. `refresh_archetype_art` recomputes every run, so archetype art is unaffected — but the per-card columns are frozen.

This change adds a third pass, `remap_scryfall`, that intentionally ignores the sentinels and re-resolves everything.

## Goals / Non-Goals

**Goals:**
- Re-resolve all existing `deck_cards` rows so resolver/heuristic changes propagate to existing data.
- Never destroy good data on a resolution miss.
- Reuse the established mode plumbing (`run.py` flag + `workflow_dispatch` option + `_refresh_all_archetype_art`).

**Non-Goals:**
- No compare-then-write optimization (redundant identical writes are acceptable and simpler).
- No schema change (all columns exist).
- No change to scrape-time enrichment or the two existing backfills.
- Not part of the daily run — it is a manual, operator-triggered maintenance pass.

## Decisions

### 1. Iterate all distinct names, not sentinel-null rows
`remap_scryfall` pages `deck_cards` by ascending id selecting `id, card_name` **with no column filter**, collecting the distinct `card_name` set (same paging idiom as the backfills, minus the `?<col>=is.null` filter). For each distinct name it resolves once and, on a hit, PATCHes `?card_name=eq.<encoded>` (again no sentinel filter) with all eight columns. Rationale: the unit of work is a card name, and every printing of a name shares the resolved values — resolving once per distinct name and rewriting all its rows is the cheapest correct approach and mirrors the existing code.

### 2. Skip misses to protect existing data
When `resolver.resolve(name)` returns `None`, `continue` without PATCHing. This satisfies "never null-out existing data": a name that no longer resolves (regression, or a data anomaly) keeps whatever it already had. The only rows ever written are those whose name resolves now, and they get the current resolved values (including nulls *from the printing itself*, e.g. a printing lacking `type_line`, which is the source of truth when the name resolves).

### 3. Always PATCH by distinct name (no compare)
No read-back/diff. `quote(name, safe='')`, no double-quoting (the PostgREST gotcha the backfills already document). Redundant writes when nothing changed are harmless; the resolver is deterministic so the pass is idempotent.

### 4. Recompute archetype art after the row pass
Call the existing `_refresh_all_archetype_art(writer)` helper so signature cards reflect any changed metadata. This is the same post-step the two backfills run.

### 5. Mode plumbing mirrors the existing flags
`run.py` gets a `if "--remap-scryfall" in argv:` branch (checked alongside the other two exact-membership checks; no substring collision — `"--remap-scryfall"` is a distinct element). It builds the resolver (fails with rc 1 if unavailable), constructs the writer, calls `remap_scryfall`, prints the count, runs `_refresh_all_archetype_art`, returns 0 — does not scrape. `scrape.yml` gains a `remap-scryfall` `workflow_dispatch` option routed via the run step's `case` to `python scraper/run.py --remap-scryfall`.

## Risks / Trade-offs

- [Heavier than the backfills — it PATCHes every distinct resolvable name, ~all of them] → It is a manual, one-time op with the service-role key (never in the daily cron); the daily run and the two gap-filling backfills are untouched. Acceptable.
- [A printing that resolves but legitimately has a null field (e.g. no `type_line`) overwrites an existing non-null value with null] → When a name resolves, the current printing is the source of truth; this is intended consistency, not data loss. The "never null-out" guarantee is specifically about *misses* (name doesn't resolve at all).
- [Redundant writes when nothing changed] → Harmless; avoids the read traffic and code of compare-then-write.

## Migration Plan

- Single PR (scraper + workflow), no schema change, so `main` is never broken.
- Usage after any resolver change: Actions → run `scrape.yml` with format `remap-scryfall` (or `gh workflow run scrape.yml -f format=remap-scryfall`).
- Rollback: the mode is additive and only runs on demand; nothing to revert operationally.

## Open Questions

- None.
