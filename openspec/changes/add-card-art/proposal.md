## Why

The UI still shows a procedural gradient placeholder where card art belongs, and a decklist is just a list of names — players recognize decks by their cards' art. Now that Scryfall mapping resolves each card to a printing, we can hotlink real Scryfall art: show a card's full image when the player hovers (mouse) or touches (mobile) its name in the decklist modal, and replace the ArchetypeCard placeholder with a representative card's art.

## What Changes

- **Store image URLs** (no re-hosting — hotlink Scryfall's CDN `image_uris`, per fair-use):
  - Add a nullable `deck_cards.image_url` (the resolved printing's `normal` image). The scraper populates it at scrape time and via the existing one-time backfill path; a resolution miss leaves it null.
  - Add a representative-card image to `archetypes` (a nullable `art_image_url` + `signature_card_name`): the scraper picks each archetype's most-played non-land card across its stored decks and stores that card's art.
- **Resolver** exposes the printing's image URL (the `Printing` gains an image field; the bulk index reads `image_uris.normal`).
- **Frontend — decklist modal:** hovering (mouse) or touching (mobile) a card name shows that card's full art in a floating preview (lazy-loaded, dismiss on leave/tap-away, graceful when no image). No layout shift.
- **Frontend — ArchetypeCard:** replace the placeholder gradient with the archetype's `art_image_url` when present (art-cropped/cover), falling back to the existing gradient when null.
- **Backfill** the new columns for existing rows once (service-role), consistent with the Scryfall backfill.

## Capabilities

### New Capabilities
- `card-art-display`: the frontend card-art UI — the decklist-modal hover/touch card-image preview and the ArchetypeCard representative-card art (with graceful fallbacks).

### Modified Capabilities
- `scryfall-card-mapping`: resolution now also exposes the printing's image URL, and deck-card enrichment stores `deck_cards.image_url`.
- `metagame-data-pipeline`: the schema gains `deck_cards.image_url` and archetype card-art columns; the scraper stores deck-card images and computes each archetype's signature-card art (scrape-time + one-time backfill).

## Impact

- **Database (explicit migration):** `supabase/schema.sql` — add `deck_cards.image_url`; add `archetypes.art_image_url` + `archetypes.signature_card_name`. All nullable, RLS read-only unchanged. Applied via the service-role (human step), idempotent.
- **Scraper:** `scryfall.py` `Printing` + index read `image_uris.normal`; `supabase_writer` stores `deck_cards.image_url` and (new) an archetype signature-card pass; `run.py --backfill-scryfall` extends to populate the new columns. New fixture fields.
- **Frontend:** `useDeckCards` selects `image_url`; a new hover/touch card-preview component used by `DecklistModal`; `ArchetypeCard` renders `art_image_url` with gradient fallback; `useArchetypes`/`useDecks` selectors expose the archetype art. Images hotlinked from Scryfall's CDN; lazy-loaded.
- **External:** relies on Scryfall CDN image URLs (hotlinked, not re-hosted); no new runtime dependency.
- **Design:** matches the dark telemetry vibe — floating preview over the modal, art-cropped archetype header; no emoji.
