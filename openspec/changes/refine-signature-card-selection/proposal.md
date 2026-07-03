## Why

The archetype signature card is currently chosen as the most-played card after excluding only **basic** lands by name, with alphabetical name as the sole tiebreak. A 4-of nonbasic land (e.g. a manland) can therefore win an archetype's "signature" slot over the real payoff spell, and among equally-played cards the pick is arbitrary. Players scan the archetype grid by artwork, so a wrong or generic signature card makes decks harder to recognize at a glance.

## What Changes

- Store four new Scryfall-derived fields per `deck_cards` row: `type_line`, `rarity`, `cmc`, and the printing's set `released_at` date.
- Store the signature card's **art_crop** image on the archetype record as a new `art_crop_url` (keep the existing `art_image_url`).
- Replace basic-land name exclusion with **type-based** exclusion: any card whose `type_line` contains "Land" is excluded from signature selection.
- Rank non-land candidates by: total quantity DESC → rarity DESC (mythic>rare>uncommon>common) → set `released_at` DESC → `cmc` DESC → `card_name` ASC (final deterministic tiebreak). Nulls sort last per criterion; a resolved card beats an unresolved one.
- Frontend `ArchetypeCard` prefers `art_crop_url`, falls back to `art_image_url`, then the gradient.
- Add a one-time `--backfill` scraper mode (service-role) that re-resolves all existing `deck_cards` rows to fill the new columns, then recomputes archetype signature cards + art_crop.
- Schema migration adds the four `deck_cards` columns and `archetypes.art_crop_url` (idempotent `add column if not exists`).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `scryfall-card-mapping`: the resolver now also exposes `type_line`, `rarity`, `cmc`, and set `released_at` for a printing, and the writer persists them on `deck_cards`.
- `metagame-data-pipeline`: signature-card selection excludes lands by type and ranks by the quantity→rarity→set-recency→cmc→name key; a `--backfill` mode re-resolves existing rows and recomputes archetype art.
- `card-art-display`: the archetype stores an `art_crop_url` and the `ArchetypeCard` prefers cropped art over the normal image, gradient fallback unchanged.

## Impact

- Schema: `supabase/schema.sql` — new `deck_cards` columns (`type_line`, `rarity`, `cmc`, `released_at`) and `archetypes.art_crop_url`. Requires a manual service-role apply, then a repopulate/backfill run.
- Scraper: `scraper/scryfall.py` (`Printing` gains fields, index reads them), `scraper/supabase_writer.py` (writer persists new fields; `_signature_card`/`refresh_archetype_art` use type-based exclusion + new ranking + art_crop; new `--backfill` path), `scraper/run.py` (wire `--backfill`).
- Frontend: `src/hooks/useMetagameBreakdown.ts` (+`art_crop_url` select/shape) and `src/components/ArchetypeCard.tsx` (prefer crop).
- Data: one-time `python scraper/run.py --backfill` to fill new columns and recompute art on existing rows.
