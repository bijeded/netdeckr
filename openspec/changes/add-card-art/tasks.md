## 1. Schema + deck-card image (one PR — shared contract)

- [x] 1.1 Migration: add nullable `deck_cards.image_url`; add nullable `archetypes.art_image_url` and `archetypes.signature_card_name` to `supabase/schema.sql` (idempotent `alter table ... add column if not exists`). Validate with **pglast**.
- [x] 1.2 RED: extend `scraper/tests/test_scryfall.py` — the resolved `Printing` carries `image_url` from `image_uris.normal` (front-face fallback for split/DFC); a fixture card exercises it.
- [x] 1.3 GREEN: `Printing` gains `image_url`; `CardIndex.from_bulk_rows` reads `image_uris.normal` (falling back to `card_faces[0].image_uris.normal`).
- [x] 1.4 RED: extend `scraper/tests/test_decklist_writer.py` — `replace_deck_cards` writes `image_url` for resolvable cards (null on miss); the backfill PATCH includes `image_url`.
- [x] 1.5 GREEN: writer stores `deck_cards.image_url` in `_deck_card_row` and adds it to `backfill_scryfall`'s PATCH body.

## 2. Archetype signature-card art (scraper)

- [x] 2.1 RED: tests for choosing an archetype's signature card — most-played non-land mainboard card across its decks (ties: count desc, name asc), resolved to a printing, stored as `signature_card_name` + `art_image_url`; archetypes with no resolvable card stay null.
- [x] 2.2 GREEN: add a signature-card pass (writer method + `run.py` wiring) that runs after the decklist pass and is included in `--backfill-scryfall`; land exclusion via a maintained land-name set.

## 3. Decklist modal card-art preview (frontend)

- [x] 3.1 RED: `useDeckCards` selects `image_url` and exposes it on `DeckCardLine`; test updated.
- [x] 3.2 RED: tests for a `CardArtPreview` (hover shows near pointer, mouse-leave hides; pointer `touch` shows and outside-tap dismisses; null image URL is a no-op; no layout shift / portal-rendered).
- [x] 3.3 GREEN: implement `useDeckCards` `image_url`, the `CardArtPreview` component/hook (portal, viewport-clamped, lazy `<img>`, `onError` hide, `prefers-reduced-motion`), and wire it into `DecklistModal`'s `CardLine`.

## 4. ArchetypeCard art (frontend)

- [x] 4.1 RED: `useArchetypes`/`useDecks` selectors expose `artImageUrl`; `ArchetypeCard` renders the art (cover) when present and the gradient placeholder when null; tests for both.
- [x] 4.2 GREEN: implement the selector fields and `ArchetypeCard` art rendering (gradient as loading backdrop + fallback).

## 5. Verify + wrap up

- [ ] 5.1 Apply `supabase/schema.sql` (service-role); run `python scraper/run.py --backfill-scryfall`; spot-check via the anon key that `deck_cards.image_url` and archetype art are populated; visually verify the modal preview (mouse + touch) and ArchetypeCard art in `npm run dev`.
- [ ] 5.2 Full suite (`npm run lint && npm run type-check && npm run test && cd scraper && ./venv/bin/pytest`).
- [ ] 5.3 `/opsx:sync` deltas into `openspec/specs/`, `/opsx:archive` the change (chore: PR), update `docs/HANDOFF.md`.
