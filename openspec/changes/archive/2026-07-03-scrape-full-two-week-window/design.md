## Context

MetaStack's scraper has two data-quality problems this change addresses:

1. **Incomplete corpus.** The decklist pass (`scraper/decklist_pipeline.py::sync_decklists`) gathers events from a single format-page fetch per window — `format?f=<code>&meta=<id>` — and never follows MTGTop8's pagination (`&cp=2`, `&cp=3`, …). MTGTop8 shows ~24 events per page, so any window with more than one page silently loses the rest. Only ~1,439 decks are stored across all formats.
2. **Wrong scope.** The scraper runs three windows up to two months, and Supabase retains six months. A *fully paginated* two-month scrape would fetch ~13.9k decks across formats — thousands of events, each costing a results-page fetch plus one decklist fetch per deck at a 2-second delay: an hours-long run.

This is the first of two changes. It makes the corpus **complete and correctly scoped** so the follow-up change (`derive-metagame-from-decks`) can compute the metagame from these decks. The metagame breakdown remains snapshot-based here.

Constraints: disciplined mode (TDD, per-group PRs, subagent review); scraper parsing must be fixture-tested and never hit live MTGTop8 in CI; `supabase/schema.sql` is not modified without an explicit migration task.

## Goals / Non-Goals

**Goals:**
- Follow every page of a window's events list so the deck corpus is complete.
- Narrow scrape + UI scope to the two-week window (last-5-days is a date subset), avoiding the two-month explosion.
- Reduce decklist retention from six months to 30 days.
- No regression: the breakdown still renders from stored snapshots; cards behave exactly as today, just with more decks available.

**Non-Goals:**
- Deriving the metagame share from decks, fixing wrong archetype names, or fixing empty archetype cards — all deferred to `derive-metagame-from-decks`.
- Dropping the `metagame_snapshots` / `format_window_freshness` tables or the `meta_window` column — deferred to the follow-up (kept here to avoid a throwaway migration).
- Any schema migration.

## Decisions

### D1: Pagination lives in `sync_decklists`, driven by "no new events" with a safety cap
The events-gathering loop fetches page 1, then `&cp=2`, `&cp=3`, … accumulating events into the existing dedupe dict. It stops when a fetched page contributes **no new event ids** (already-seen or already-in-DB), or when a safety cap (~20 pages) is hit. Rationale: MTGTop8 has no reliable "last page" marker, and the incremental skip-set means a fully-known page naturally yields zero new events — a clean, self-terminating condition that also short-circuits daily runs after the first backfill. `format_url` gains an optional `cp` param; the fetch closure in `run.py` passes it through.

**Alternative considered:** parse the pager control for a max page number. Rejected — more brittle HTML coupling than counting new events, and it wouldn't short-circuit the incremental case.

### D2: Pagination and scope reduction ship together
Paginating the *current* scope would fetch all pages of the two-month window — the exact ~13.9k-deck explosion we are avoiding. So this change scopes decklist gathering to the two-week window *and* paginates in the same change; pagination is never applied to a two-month scrape. This is why the "pagination first" step also carries the scope reduction.

### D3: No schema migration; leave the `meta_window` CHECK permissive
The `2months` snapshot simply stops being written, and the UI stops offering it. The `metagame_snapshots.meta_window` / `format_window_freshness.meta_window` CHECK constraints still permit `2months`, but nothing writes it and any stale `2months` rows are harmless (unreferenced by the UI). The follow-up change drops these tables entirely, so narrowing the CHECK now would be throwaway work. `supabase/schema.sql` is untouched.

### D4: The breakdown fetch is not paginated
Only the **events list** paginates. The metagame breakdown table on the format page is a single aggregate on page 1, so `pipeline.py` / `parse_meta_breakdown` are unchanged. Pagination is confined to the decklist pass.

### D5: Frontend window list shrinks to two; unknown params fall back
`src/lib/windows.ts` drops `2months` from `WINDOWS` and `WINDOW_DAYS`; `WindowSelector` renders two options. `normalizeWindow` already returns the default for any unrecognized `?w=`, so a bookmarked `?w=2months` link degrades gracefully to Last 5 Days. Default remains `5days`.

## Risks / Trade-offs

- **First post-merge run is heavier than a daily run** (it backfills the fuller two-week corpus across all pages) → Mitigation: it is still bounded by two weeks of events, far below the two-month volume; the 2-second delay keeps it polite; subsequent daily runs short-circuit via the skip-set (D1).
- **A page-count runaway if the stop condition never trips** (e.g. MTGTop8 returns unexpected repeating pages) → Mitigation: the ~20-page safety cap bounds worst-case requests per format.
- **Stale `2months` snapshot rows linger** after this change → Mitigation: harmless (unreferenced by the two-window UI) and fully removed by the follow-up change's table drop.
- **Fixture drift**: a new page-2 fixture must reflect real MTGTop8 markup → Mitigation: capture it deliberately from a live paginated events page and assert the parser against it, per the fixtures convention.

## Migration Plan

1. Land the scraper + frontend changes via per-group PRs (TDD, subagent review), then human-merge.
2. On merge to `main`, the daily pipeline (or a manual `workflow_dispatch`) runs: it paginates the two-week window, backfilling the fuller corpus, and the prune drops events older than 30 days.
3. No schema step. Rollback is a straight revert — no data migration to undo (stale `2months`/older rows are inert and pruned over time).

## Open Questions

- Per-archetype **display count** (currently 4) is intentionally left for the follow-up change, where it pairs with the derived-breakdown UI work.
