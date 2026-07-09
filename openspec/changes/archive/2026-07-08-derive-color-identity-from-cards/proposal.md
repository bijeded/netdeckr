## Why

Many archetypes render as a single gray "colorless" pip because their names carry no color signal (e.g. named for a card or mechanic rather than a guild/shard/mono/letter code), even though their decks are obviously colored. The archetype's decks — already scraped and mapped to Scryfall — carry each card's authoritative WUBRG color identity, giving us a second signal to fill the gap with no new scraping.

## What Changes

- Add card-derived color identity as a **fallback** in the scraper's archetype pass: when `color_identity_for(name)` returns `""`, derive the archetype's WUBRG color identity from the union of its decks' cards' Scryfall `color_identity`, filtered by a deck-presence threshold so occasional splashes don't add a pip.
- Name-derived identities keep **precedence**: an archetype whose name already yields a color identity is left unchanged.
- Capture `color_identity` on the Scryfall `Printing`/`CardIndex` (it is already present in the bulk rows; the dataclass just doesn't carry it yet).
- Recompute and **persist** the fallback identity on `archetypes.color_identity` during the existing archetype-refresh pass (so a color identity can change/be filled as decks accumulate, unlike today's insert-only write).
- A one-time backfill/recompute (service-role) corrects already-stored archetypes in place; idempotent.
- No schema migration (`archetypes.color_identity` already exists) and no frontend change (the card already renders `color_identity` as pips).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: the archetype's stored WUBRG color identity is derived from the archetype name **and**, when the name yields no color, from the union of its decks' cards' Scryfall color identities (threshold-filtered for splashes); the value is recomputed each run rather than written only on first insert.

## Impact

- **Scraper:** `scraper/scryfall.py` (`Printing`, `CardIndex.from_bulk_rows` capture `color_identity`), `scraper/supabase_writer.py` (archetype-refresh pass computes + persists the fallback identity), `scraper/mtgtop8.py` (`color_identity_for` stays the primary signal; a small helper may combine name + card colors).
- **Backfill:** a one-time recompute over existing archetypes via the service-role key (mirrors `refine-signature-card-selection`'s pattern); exposed through `scraper/run.py`.
- **No schema, frontend, or dependency change.** `archetypes.color_identity` and the pip rendering are untouched.
