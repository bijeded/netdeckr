## 1. Carry Scryfall color identity on the printing

- [x] 1.1 Add a `color_identity` field to the `Printing` dataclass in `scraper/scryfall.py` (WUBRG letters, empty for colorless)
- [x] 1.2 Populate it in `CardIndex.from_bulk_rows` from the bulk row's `color_identity` (default to empty when absent)
- [x] 1.3 Unit test: a resolved printing exposes the expected `color_identity` (mono, multi, colorless) — fixture-based

## 2. Card-derived color-identity helper

- [x] 2.1 Add a pure helper (in `scraper/mtgtop8.py`, alongside `color_identity_for`) that takes per-deck card color sets and returns the WUBRG-ordered union of colors meeting the deck-presence threshold; add the `COLOR_IDENTITY_MIN_DECK_SHARE` constant
- [x] 2.2 Unit tests: base color kept, splash color (below threshold) excluded, colorless-only → empty, WUBRG ordering, threshold boundary

## 3. Persist derived color identity in the archetype pass

- [x] 3.1 Add `refresh_archetype_color_identity(fmt)` to `scraper/supabase_writer.py`, mirroring `refresh_archetype_art`: for each archetype, use the name-derived identity when non-empty, else compute the card-derived value from its mainboard deck cards (resolved via the card resolver) and PATCH `archetypes.color_identity`
- [x] 3.2 Wire the new pass into the per-format scrape run wherever `refresh_archetype_art` runs
- [x] 3.3 Tests: name-derived identity preserved; empty-name archetype filled from cards; recompute is idempotent; PATCH targets `color_identity` only

## 4. One-time backfill / recompute

- [x] 4.1 Extend the maintenance path in `scraper/run.py` (the `--refresh`/art-refresh flow, or a `--refresh-color-identity` flag) to run `refresh_archetype_color_identity` across all formats with the service-role key
- [x] 4.2 Document the one-time run command in the change (and note it for HANDOFF): run after merge, idempotent

## 5. Verify

- [x] 5.1 Run the scraper test suite (`cd scraper && ./venv/bin/pytest`) green
- [x] 5.2 Live read-only check across the five formats: previously-gray, name-colorless archetypes now show correct card-derived pips; name-derived archetypes unchanged. One-time backfill run via Actions `format=refresh-color-identity` (updated ST 2 / PI 14 / MO 66 / PAU 67 / PREM 0). Verified: name-derived correct, card-derived sensible on real samples (PI Arclight Phoenix→UR, PAU Affinity→UBR). **Deferred:** on tiny (2-deck) archetypes a single-deck splash can leak (pure share threshold); a minimum absolute deck-count floor is a candidate follow-up. Kept `COLOR_IDENTITY_MIN_DECK_SHARE=0.35` (base colors correct on real samples).
