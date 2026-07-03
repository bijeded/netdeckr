<!--
Disciplined mode: each numbered group is one branch + one PR (TDD → subagent
code-review → PR → human merge). Merge order MUST be Group 1 → 2 → 3 → 4 (design D3):
frontend stops reading the snapshot tables first (safe; decks already exist), then
the scraper stops writing them + stamps per-format freshness, then the schema drops
them (human applies schema.sql after merge), then docs/sync/archive. The only
intermediate effect (group 1 before group 2) is a possibly-null formats.last_updated_at,
which gracefully hides the freshness line — no broken state.
-->

## 1. Frontend: derive the breakdown from decks

- [x] 1.1 Write tests first: a `useMetagame(format, window)` hook that, given mocked deck rows (archetype name/color/art + event_date), returns `breakdown` (group by archetype → `share = count/total*100`, ranked by count desc, top 20, carrying colorIdentity + art) and `decksByArchetype` (existing `selectDisplayDecks` per archetype); empty breakdown + empty map when there are no decks; error surfaced.
- [x] 1.2 Implement `src/hooks/useMetagame.ts`: one Supabase fetch of the window's decks (`decks` join `archetypes(name,color_identity,art_image_url,art_crop_url)` + `events!inner(event_date,format_code)`, `format_code` eq + `event_date >= windowStartISO(window)`), then derive both outputs from the same rows. Reuse `selectDisplayDecks` and the `ArchetypeShare` shape.
- [x] 1.3 Repoint `src/hooks/useLastUpdated.ts` to read `formats.last_updated_at` by `format_code` (drop the `format_window_freshness`/`meta_window` query); return null (indicator hidden) when absent.
- [x] 1.4 Update `src/App.tsx` to use the merged hook (breakdown + decksByArchetype from one call); every shown archetype is expandable; keep loading/empty/error states; derive `maxPct` from the breakdown.
- [x] 1.5 Bump `DISPLAY_COUNT` 4 → 6 in `src/lib/deckSelection.ts` (update its test).
- [x] 1.6 Remove `src/hooks/useMetagameBreakdown.ts` (+ test) and any remaining `metagame_snapshots` read; update `useDecks`/App tests (fold `useDecks` into `useMetagame` or keep `useDecks` for the modal path — pick one and keep it consistent).
- [x] 1.7 `npm run lint`, `npm run type-check`, `npm run test` — all green; no `metagame_snapshots`/`format_window_freshness`/`meta_window` references remain in `src/`.

## 2. Scraper: retire the breakdown pass, stamp per-format freshness

- [ ] 2.1 Write tests first: `run.py main` no longer calls the breakdown pass (`sync_all` not invoked) and stamps each format's `formats.last_updated_at` on success; a `writer.stamp_format_updated(fmt, now)` writes `formats.last_updated_at`.
- [ ] 2.2 Remove the breakdown pass: delete `scraper/pipeline.py` (`sync_format`/`sync_all`) and its `run.py` wiring; remove `parse_meta_breakdown`/`rank_archetypes` from `scraper/mtgtop8.py` and `replace_breakdown`/`stamp_updated` from `scraper/supabase_writer.py` (now unused). Delete their dead tests (`test_pipeline.py`, `test_parse_meta.py`, breakdown cases in `test_mtgtop8.py`).
- [ ] 2.3 Add `writer.stamp_format_updated` and call it per format after a successful scrape in `run.py`.
- [ ] 2.4 Clean up the now-unused `WINDOWS` list (breakdown-only); keep `WINDOW_META`/`meta_id_for` (the decklist pass still resolves the 2-week meta id per format). Confirm `upsert_archetype` still sets `color_identity` (it does).
- [ ] 2.5 `cd scraper && ./venv/bin/pytest` — all green; no test hits live network.

## 3. Schema: drop the snapshot + freshness tables and meta_window

- [ ] 3.1 In `supabase/schema.sql`: remove the `metagame_snapshots` and `format_window_freshness` create/migration/remap/RLS/grant blocks, and add idempotent `drop table if exists public.metagame_snapshots cascade;` / `... format_window_freshness cascade;` so applying the schema removes them from the live DB. `meta_window` disappears with the tables.
- [ ] 3.2 Rework the one-time archetype-dedupe block that references `metagame_snapshots` (`has_snapshot`): pick the canonical row by lowest id and drop the snapshot move/delete steps (keep the deck re-point + orphan delete + the `(format_code, lower(name))` unique index).
- [ ] 3.3 Validate `schema.sql` with `pglast` (parses clean, no reserved-word-as-identifier, idempotent/re-runnable). Note in the PR that a human applies it with the service-role key **after** merge (safe — nothing reads/writes the tables by then).

## 4. Docs, memory, sync + archive

- [ ] 4.1 `CLAUDE.md` → the metagame breakdown is derived from the scraped decks; freshness is per-format (`formats.last_updated_at`); no `metagame_snapshots`/`format_window_freshness`/`meta_window`.
- [ ] 4.2 `openspec/project.md` → architecture: breakdown derived from decks; remove the `meta_window` logical-key sentence.
- [ ] 4.3 `docs/HANDOFF.md` → data model (drop the snapshot/freshness tables + `meta_window`), gotchas (the `meta_window` note is now obsolete), and a shipped entry for this change.
- [ ] 4.4 Update the `meta-window` auto-memory (the column no longer exists — rewrite or delete) and its `MEMORY.md` pointer.
- [ ] 4.5 `/opsx:sync` the deltas into `openspec/specs/metagame-breakdown-view` + `openspec/specs/metagame-data-pipeline`.
- [ ] 4.6 `/opsx:archive` the change (lands via a `chore:` PR since `main` is protected).
