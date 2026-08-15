## Why

Modern Belcher's archetype card shows Sea Gate Restoration art instead of a card that
reads as the deck. `Sea Gate Restoration // Sea Gate, Reborn` is a modal double-faced
card whose back face is a land; the deck plays it as a land, but it is now winning
signature-card selection.

This is a regression from `fix-face-name-card-resolution`. Signature selection excludes a
card whose `type_line` contains "Land", and it used to see the combined
`"Sorcery // Land"` line. That change made `deck_cards.type_line` describe only the face
the deck plays — correctly, for trending's creature/spell split and the decklist modal's
grouping — so the land exclusion now sees `"Sorcery"` and lets the card through. Every
land-backed MDFC (Agadeem's Awakening, Turntimber Symbiosis, Shatterskull Smashing) is
affected the same way, not just Belcher.

## What Changes

- Signature-card selection excludes a card when **any** of its faces is a land, not only
  when the face the deck plays is. A land-backed MDFC is never chosen as an archetype's
  signature card.
- `deck_cards.type_line` keeps its current per-face meaning. Trending's creature/spell
  split, the decklist modal's grouping, and every other consumer are unchanged — the new
  rule applies to signature selection alone.
- Non-land MDFCs (Valki // Tibalt, Ondu Inversion) stay eligible. The rule is about land
  faces, not about being double-faced.
- Archetype name does not influence selection. An archetype whose signature card happens
  to match its name is a coincidence, not a goal.
- No schema change and no new column: the land-face signal comes from the Scryfall
  resolver already available during the signature pass.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `metagame-data-pipeline`: the signature-card selection requirement's land exclusion
  changes from "the stored `type_line` contains Land" to "any face of the card is a
  land", and its DFC scenario is restated for the per-face `type_line` the pipeline now
  stores.

## Impact

- **Scraper**: `scraper/supabase_writer.py` (`_signature_card`, `refresh_archetype_art`)
  and `scraper/scryfall.py` (the resolved-printing record gains a land-face signal).
  Tests in `scraper/tests/`.
- **Supabase**: no schema change, no new column, no RLS change. Only the `archetypes`
  art columns (`signature_card_name`, `art_image_url`, `art_crop_url`) change value, via
  the existing service-role write path in CI.
- **Frontend**: none. No component, hook, or locale string changes; archetype cards
  render whatever art the pipeline stored.
- **Blast radius**: every format's archetypes whose current signature card has a land
  face — their art changes on the next pipeline run. User-visible, so the archetype grid
  needs a look on the Vercel preview.
- **Rollout**: self-healing. `refresh_archetype_art` is idempotent and recomputes from
  current decks each run, so the next scheduled run corrects affected archetypes; no
  backfill or remap pass is required.
- **Unaffected**: the 7days/2weeks window model and the 30-day retention window.
