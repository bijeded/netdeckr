## 1. Verify the front-face assumption

- [x] 1.1 Check the saved decklist fixtures under `scraper/tests/fixtures` for any card name MTGTop8 emits as a non-front face of a multi-face card; record the finding in design.md (front-face priority is built on this holding)

## 2. Scraper: face-aware resolution

- [x] 2.1 Split `_name_keys` in `scraper/scryfall.py` into primary keys (full canonical name + front face) and secondary keys (remaining faces)
- [x] 2.2 Register the two tiers in `CardIndex.from_bulk_rows` as two `setdefault` passes over `best`, iterating in sorted canonical-name order so within-tier ties are deterministic
- [x] 2.3 Specialize the `Printing` stored per face key with that face's `type_line` (the full-name key of a multi-face card carries the front face's), leaving `resolve()`'s signature and every call site unchanged

## 3. Scraper tests

- [x] 3.1 Add resolution tests covering the priority tiers: a standalone card beats a foreign back face in both bulk orderings, a front face beats another card's back face, and a back-face-only name still resolves
- [x] 3.2 Add type-line tests per multi-face layout (`transform`, `prepare`, `modal_dfc`, `adventure`, `split`, `flip`) asserting the stored line names one face and contains no `//`; include the two reported cards as named cases
- [x] 3.3 Run `cd scraper && pytest` green

## 4. Frontend and database verification

- [x] 4.1 Confirm `cardCategory` in `src/lib/cardType.ts` and the `top_cards` `category`/land predicates in `supabase/schema.sql` need no edit, and add a `cardType` test asserting a single-face sorcery line whose card has a creature back face classifies as a spell
- [x] 4.2 Run `npm run lint`, `npm run type-check`, and `npm run test` green

## 5. Ship and migrate

- [x] 5.1 Open the PR and confirm the user-visible change (CLAUDE.md exception 1). The Vercel preview could not show it — no frontend/SQL code changed and the preview reads the same production DB — so confirmation came from a dry run of the remap instead: 1 identity change, 40 grouping moves, 39 trending moves, 0 new misses, approved by the user before merge
- [x] 5.2 After merge, run `--remap-scryfall` against production (dispatched via the `scrape.yml` workflow, which holds the service-role secret): re-resolved **149,320** rows, matching the dry run exactly
- [x] 5.3 Verified against production: `Replenish` → UDS 15 `Sorcery`, `Esper Origins` → `Sorcery`, both `category=spell` from the `top_cards` RPC; zero rows retain a combined `//` type line
