## Why

Printing selection picks the wrong Scryfall printing in three distinct ways, one of which is a data defect and two of which are art-quality defects:

1. **Reversible-printing defect (data).** Secret Lair `reversible_card` printings carry `type_line: null` and `cmc: null`. They are keyed in the index under their doubled name (`"Ajani Goldmane // Ajani Goldmane"`), which is a *different* bucket from the plain card, so the two printings never compete on the selection ranking at all — whichever one reaches the shared face-name key first wins, purely by bulk-file order. 166 `deck_cards` rows carry null `type_line`/`cmc` as a result, and the `top_cards` RPC tags a null type line as a non-creature, mis-sorting those cards into Trending Spells.
2. **Alternate-treatment printings win on wholly-Universes-Beyond sets (art).** `universesbeyond` in `promo_types` was intended to catch a crossover card appearing in a normal set. On a fully-UB set every printing carries it, so it stops discriminating: for `Aang's Iceberg` the plain `tla` #5 and the borderless showcase `tla` #336 tie on treatment, set type, release date, and set code — a total tie decided by file order, which currently returns the showcase art. Scryfall's own `boosterfun` promo type marks exactly the alternate-treatment booster variants we want to avoid and is not consulted anywhere.
3. **Reprint-product printings beat real sets (art).** `masters` sits in the preferred set-type tier alongside `expansion`/`core`, so Mystery Booster 2 (`mb2`, `set_type: masters`, 2024-08-02) beats the plain `big` #27 expansion printing on recency. Secret Lair and other `box` products sit at the neutral tier and win outright whenever no preferred-tier printing exists.

## What Changes

- **Reject `reversible_card` layouts outright.** A printing whose `layout` is `reversible_card` is never an eligible candidate — it is filtered at the same gate as digital, foil-only, and joke/token printings, so a null `type_line` can never win even for a card with no other paper printing.
- **Add `boosterfun` to special-treatment detection.** A printing carrying `boosterfun` in `promo_types` is special-treatment and loses to any plain printing.
- **Drop `universesbeyond` from special-treatment detection.** It misfires on wholly-UB sets, and `boosterfun` now covers the crossover-variant cases it was added for.
- **Move `masters` from the preferred set-type tier to neutral.** Reprint/draft products stop beating real expansion printings.
- **Demote `box` to the lowest set-type tier.** Secret Lair and the other 24 `box` sets (Game Night, Guild Kits, Challenger Decks, Salvat, Beatdown …) are chosen only when nothing else exists.
- **Re-resolve stored data.** The existing `remap_scryfall` pass and `refresh_archetype_art` are run after the resolver change so the 166 broken rows and any art whose selection shifts are corrected in place. No new backfill machinery is introduced.
- **Measure the blast radius before shipping.** The number of cards whose selected printing changes under the new ranking is counted against the current bulk file, so the data diff is known rather than discovered in production.

Not changing: the 7days/2weeks time-window model, the 30-day retention window, the derived-at-read-time metagame breakdown, the browser's read-only access, or any table schema. This is a resolver-ranking change plus a re-resolution run.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scryfall-card-mapping`: the printing-eligibility filter gains a `reversible_card` layout rejection; the special-treatment definition gains `boosterfun` and loses `universesbeyond`; the set-type tiers move `masters` to neutral and add `box` to the demoted tier.

## Impact

- **Scraper.** `scraper/scryfall.py` — `_is_paper_nonfoil`, `_is_special_printing`, `_set_type_tier`, and the module docstring describing the ranking. `scraper/tests/` gains cases for each of the five rules; existing selection tests that assert the old `masters`-is-preferred or `universesbeyond`-is-special behavior need updating.
- **Supabase data (no schema change).** `deck_cards.set_code`, `collector_number`, `image_url`, `type_line`, `rarity`, `cmc`, `released_at` are rewritten for affected names by `remap_scryfall`; `archetypes.signature_card_name`, `art_image_url`, `art_crop_url` are rewritten by `refresh_archetype_art`. Both are existing service-role CI operations; no RLS policy changes and no browser write path.
- **Frontend (no code change).** Trending Cards stops mis-classifying the 166 previously-null-`type_line` cards as spells once the data is repaired, because the `top_cards` RPC reads `type_line`. Card-art previews and archetype art change for whichever cards the new ranking moves.
- **Dependencies.** None added.
