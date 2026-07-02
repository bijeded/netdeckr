## Context

Scryfall mapping already resolves each `deck_cards` row to a printing (`scryfall_name`/`set_code`/`collector_number`) and the resolver reads Scryfall bulk rows that also carry `image_uris` (a CDN URL per size). The frontend has a `DecklistModal` (renders `CardLine`s from `useDeckCards`) and an `ArchetypeCard` that draws a procedural gradient placeholder in its art region. CLAUDE.md mandates hotlinking Scryfall `image_uris` (no re-hosting), RLS read-only browser access, and all strings via i18next. The scraper is Python 3.12 (venv 3.9), dependency-light, fixture-tested; the writer talks PostgREST with the service-role key; `run.py --backfill-scryfall` already exists for one-time maps.

## Goals / Non-Goals

**Goals:**
- Store the resolved printing's `normal` image URL on `deck_cards`; store a representative-card image per archetype.
- Decklist modal: hover (mouse) / touch (mobile) a card name → floating full-card preview, lazy-loaded, graceful on miss, no layout shift, viewport-clamped.
- ArchetypeCard: real art when present, gradient fallback otherwise.
- Hotlink Scryfall CDN URLs; keep RLS read-only; localize any new strings.

**Non-Goals:**
- No image re-hosting/proxying/caching on our side (hotlink only).
- No foil/special-art selection (reuse the existing standard-printing pick).
- No new art sizes beyond `normal` (art-crop is derivable later if needed).
- No hover-preview on the ArchetypeCard itself (its art is inline); preview is a modal feature.

## Decisions

- **Store URLs, don't reconstruct.** Add nullable `deck_cards.image_url` and `archetypes.art_image_url` + `archetypes.signature_card_name`. Scryfall CDN URLs carry a content hash and aren't reconstructable from set/collector, and CLAUDE.md says hotlink `image_uris` — so persist the URL. Alternative (client-side `api.scryfall.com/cards/:set/:cn?format=image` redirect) rejected: it hits the rate-limited API per image rather than the CDN.
- **`normal` size.** `image_uris.normal` (~488×680) is the right balance for a hover preview and archetype art; store that single URL. Split/DFC cards use the top-level `image_uris` when present, else the front face's (`card_faces[0].image_uris`).
- **`Printing` gains `image_url`.** The resolver already selects a printing row; read `image_uris.normal` (front-face fallback) into the dataclass. `CardIndex` unchanged in shape.
- **Writer** adds `image_url` to the `deck_cards` row (null on miss), mirroring the existing Scryfall columns. Backfill's PATCH adds `image_url` alongside the others.
- **Archetype signature card = most-played non-land.** After decks are stored, for each archetype tally `quantity` per `card_name` across its decks (mainboard only), exclude basic/nonbasic lands (a name-based land check — resolver has no type line; use a maintained basic-land set + "Plains/Island/…"; a fuller type-based exclusion is a follow-up), pick the top card, resolve it, and store `signature_card_name` + `art_image_url`. Runs as a per-format pass in `run.py` after the decklist pass, and is included in the backfill entry point. Ties broken deterministically (count desc, name asc).
- **Frontend preview component.** A `CardArtPreview` (or a `useCardPreview` hook + a portal-rendered `<img>`): `onMouseEnter`/`onFocus` show near the pointer/anchor; `onMouseLeave`/blur hide; on touch, `onPointerDown` (pointerType `touch`) shows and an outside tap hides. Lazy: only mount/`src`-set the `<img>` when active. Clamp position to the viewport; render in a portal above the modal so it never shifts the list. No-op when `imageUrl` is null. Respect `prefers-reduced-motion` for any fade.
- **ArchetypeCard.** Render `art_image_url` as a cover `background-image`/`<img>` in the existing art region; keep the gradient as the fallback (and as a backdrop while the image loads). `useArchetypes`/`useDecks` selectors expose the new fields.

## Risks / Trade-offs

- **Broken/slow image URLs** → `<img>` `onError` hides the preview / falls back to the gradient; lazy-load so nothing fetches until interacted with.
- **Land-exclusion heuristic is name-based** (no type line in the resolver) → may occasionally pick a nonbasic land as "signature." Mitigation: exclude a maintained land-name set; accept imperfection, flag a type-based follow-up. Never fatal (just a suboptimal art).
- **Backfill volume** → the new columns backfill on the same null-filtered pass; the archetype pass is one row per archetype (small). Idempotent as before.
- **Touch vs hover ambiguity** → drive off Pointer Events (`pointerType`) rather than mouse/touch-specific listeners; test both paths in jsdom with synthetic pointer events.
- **Layout shift** → preview is portal/fixed-positioned, never in flow; assert the list isn't reflowed.

## Migration Plan

1. Land the schema+scraper PR(s); apply `supabase/schema.sql` via the service-role (human), which adds the nullable columns (idempotent).
2. Run `python scraper/run.py --backfill-scryfall` (service-role) to populate `deck_cards.image_url` and the archetype art for existing data.
3. Frontend PRs read the new columns; ship the preview + archetype art. Rollback: columns are additive/nullable; reverting frontend hides art; reverting scraper stops populating — existing values stay valid.

## Open Questions

- Land exclusion for the signature card: ship the name-based heuristic now, or wait for a type-based signal (would need storing card types)? Default: name-based now, type-based as a follow-up.
