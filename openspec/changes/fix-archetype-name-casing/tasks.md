## 1. Reproduce the defect (bug-fix skill, failing test first)

- [x] 1.1 (reproduced at the writer level per decision — see 1.2; no HTML fixture) Save an MTGTop8 event-page fixture under `scraper/tests/fixtures/` whose results table title-cases an archetype the breakdown page spells differently (e.g. `Uw Control`). Regenerate deliberately; never hit live MTGTop8 in CI.
- [x] 1.2 Add a failing pytest asserting the decklist archetype name normalizes/resolves to the same canonical archetype key as the breakdown name (case-insensitive), for a known collision (`UW Control` / `Uw Control`).

## 2. Scraper: case-insensitive canonical archetype resolution

- [x] 2.1 Make the archetype get-or-create match case-insensitively within a format (`lower(name)`), reusing the existing row on a case-variant hit instead of inserting a new one; keep the first-seen (breakdown-preferred) display name. Files: `scraper/mtgtop8.py` + the archetype upsert in `scraper/run.py` (PostgREST).
- [x] 2.2 Ensure the PostgREST upsert path targets the functional uniqueness correctly (explicit select-then-insert, or `on_conflict` against the `lower(name)` index).
- [x] 2.3 Make 1.2 pass; add a regression test that a second case-variant scrape does not create a duplicate row.

## 3. Schema: enforce case-insensitive archetype uniqueness

- [x] 3.1 In `supabase/schema.sql`, add a unique index on `(format_code, lower(name))` for `archetypes` (idempotent), sequenced to run **after** the merge in §4 so it doesn't fail on existing duplicates. Keep or drop the old case-sensitive `unique(format_code, name)` as appropriate.
- [x] 3.2 Validate the SQL with **pglast** (real libpg_query), not sqlglot.

## 4. Data migration: merge existing duplicate archetype rows

- [x] 4.1 Write an idempotent SQL migration: for each `(format_code, lower(name))` group with >1 row, pick the canonical row (prefer the one with `metagame_snapshots`, else lowest id / breakdown casing), re-point `decks.archetype_id` and `metagame_snapshots.archetype_id` to it, delete the orphan rows.
- [x] 4.2 Document that applying the migration + the new index needs the **service-role key** (human/CI step; assistant has anon only). Provide the apply order: merge (4.1) → add unique index (3.1).
- [ ] 4.3 After apply, re-run the read-only anon audit to confirm zero within-format case-collision groups remain and the previously stranded ~30 decks now resolve to a snapshot-bearing archetype.

## 5. Review & wrap-up

- [x] 5.1 Full suite: `npm run lint && npm run type-check && npm run test && cd scraper && ./venv/bin/pytest` (frontend unaffected but keep it green).
- [x] 5.2 Clean-context `code-review` subagent on the diff; address findings.
- [ ] 5.3 `github-pr` → human squash-merge → apply schema/migration with service-role key → tick boxes → `/opsx:sync` + `/opsx:archive` via a `chore:` PR.
