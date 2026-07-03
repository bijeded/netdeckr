# Tasks

Disciplined mode: each `##` group is one branch → PR → human merge. Groups 1 bundles the schema + resolver + writer + selection contract into ONE PR so `main` never sees a broken intermediate (additive nullable columns + the scraper that fills them + the selection that reads them).

## 1. Schema, card metadata & type-based signature selection (one PR)

- [x] 1.1 Schema: in `supabase/schema.sql`, add nullable `type_line text`, `rarity text`, `cmc numeric`, `released_at date` to `deck_cards` and `art_crop_url text` to `archetypes`, using idempotent `add column if not exists`; document the columns in the table comments.
- [x] 1.2 (TDD) `scraper/scryfall.py`: extend `Printing` with `type_line`, `rarity`, `cmc`, `released_at`, `art_crop_url` (all nullable); add an `_art_crop_url` helper mirroring `_normal_image_url` (front-face fallback); have `CardIndex.from_bulk_rows` read these from the chosen bulk row. Tests: a resolved printing carries type_line/rarity/cmc/released_at/art_crop; split/DFC art_crop falls back to the front face.
- [x] 1.3 (TDD) `scraper/supabase_writer.py`: when writing deck cards, persist `type_line`, `rarity`, `cmc`, `released_at` from the resolved printing (null on a miss). Tests: new deck cards store the metadata; unresolved cards leave it null.
- [x] 1.4 (TDD) Replace `_BASIC_LAND_NAMES` exclusion with type-based exclusion in `_signature_card`: exclude any card whose `type_line` contains "land" (case-insensitive); a null type_line is NOT excluded. Fetch `type_line, rarity, cmc, released_at` alongside `card_name, quantity`. Tests: a 4-of nonbasic land is excluded; a null-type card remains a candidate.
- [x] 1.5 (TDD) Implement the ranking key in `_signature_card`: sort candidates by quantity DESC → rarity DESC (mythic>rare>uncommon>common) → released_at DESC → cmc DESC → name ASC, with null metadata sorting last per criterion. Tests: rarity breaks a quantity tie; set recency breaks a rarity tie; cmc breaks a set tie; name breaks a full tie; a card with resolved metadata beats an unresolved one at equal quantity.
- [x] 1.6 (TDD) `refresh_archetype_art`: write `art_crop_url` (from the resolved signature printing) alongside `art_image_url`; leave both null when the card does not resolve. Update the docstring (signature card is now the ranked non-land card). Tests: archetype records name + normal image + art_crop; only-lands archetype stays null.
- [x] 1.7 Run `cd scraper && ./venv/bin/pytest`; `npm run type-check` unaffected. Validate `schema.sql` with `sqlglot`.
- [x] 1.8 Code-review subagent (clean context) over the diff; address findings. Then github-pr.

## 2. Frontend: ArchetypeCard prefers cropped art (one PR)

- [x] 2.1 (TDD) `src/hooks/useMetagameBreakdown.ts`: add `art_crop_url` to the `archetypes(...)` select and the row type; expose a crop-preferred art URL (`art_crop_url ?? art_image_url`) in the shaped result (keep `artImageUrl` available). Update `useMetagameBreakdown.test.tsx` fixtures.
- [x] 2.2 (TDD) `src/components/ArchetypeCard.tsx` (+ test): render the crop-preferred URL as the cover art; fall back to normal image, then gradient. Tests: crop shown when present; normal image shown when only it present; gradient when both null.
- [x] 2.3 `npm run lint`, `npm run type-check`, `npm run test`. Code-review subagent → github-pr.

## 3. One-time `--backfill` mode (one PR)

- [x] 3.1 (TDD) `scraper/supabase_writer.py`: add a backfill path that re-resolves `deck_cards` rows missing the new metadata (e.g. `type_line is null`) and writes `type_line/rarity/cmc/released_at` (plus any missing identity/image columns), idempotently. Tests: rows missing metadata get filled; already-filled rows unchanged; unresolved rows stay null.
- [x] 3.2 (TDD) `scraper/run.py`: wire a `--backfill` flag (mirroring `--backfill-scryfall`) that runs the metadata backfill then `refresh_archetype_art` per format. Test the arg handling where feasible.
- [x] 3.3 `cd scraper && ./venv/bin/pytest`. Code-review subagent → github-pr.

## 4. Deploy & verify (post-merge, human/service-role steps)

- [ ] 4.1 Apply `supabase/schema.sql` in the Supabase SQL editor with the service-role key (adds the new columns; idempotent).
- [ ] 4.2 Run `python scraper/run.py --backfill` once (service-role) to fill new columns and recompute archetype signature cards + art_crop; record how many rows/archetypes updated.
- [ ] 4.3 Spot-check via anon `curl`/PostgREST that `archetypes.art_crop_url` is populated and that a known archetype's signature card is a non-land payoff (not a manland); confirm the live ArchetypeCard renders the crop.
- [ ] 4.4 After all groups merged: `/opsx:sync` the deltas into `openspec/specs/`, then `/opsx:archive` (both via a `chore:` PR). Update `docs/HANDOFF.md` (mark deferred item #1 done).
