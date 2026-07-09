## ADDED Requirements

### Requirement: Archetype color identity from name, then cards
The scraper SHALL derive each archetype's stored WUBRG `color_identity` from its name as the primary signal and, only when the name yields no color identity, from the union of its decks' cards' Scryfall color identities. The card-derived fallback SHALL include a color only when that color appears in at least a configured minimum share of the archetype's decks, so that an occasional splash does not add a color pip. The derived value SHALL be recomputed and persisted on each run (not written only when the archetype is first inserted), so an archetype's color identity can be filled or corrected as its decks accumulate. When neither the name nor the cards yield any color (e.g. an all-colorless deck, or no resolvable cards), the color identity SHALL remain empty.

#### Scenario: Name yields a color identity
- **WHEN** an archetype's name carries a recognizable color signal (guild, shard, mono-color, or an explicit WUBRG letter code)
- **THEN** the stored color identity is the name-derived WUBRG value and the card-derived fallback is NOT applied

#### Scenario: Name has no color, cards supply it
- **WHEN** an archetype's name yields no color identity but its decks' cards resolve to Scryfall color identities
- **THEN** the stored color identity is the WUBRG-ordered union of the colors that appear in at least the minimum share of the archetype's decks

#### Scenario: Splash color is excluded
- **GIVEN** an archetype whose name yields no color and whose decks contain a color appearing in fewer than the minimum share of its decks
- **WHEN** the color identity is derived from its cards
- **THEN** that splash color is omitted from the stored color identity

#### Scenario: No color signal from name or cards
- **WHEN** an archetype's name yields no color identity and its decks resolve only to colorless cards (or no cards resolve)
- **THEN** the stored color identity remains empty (rendered as a single gray pip by the dashboard)

#### Scenario: Recompute corrects an existing archetype in place
- **GIVEN** an archetype already stored with an empty color identity because its name carried no color
- **WHEN** the archetype-refresh pass runs and its decks' cards yield a card-derived color identity
- **THEN** the archetype's stored color identity is updated to the card-derived value without requiring the archetype to be re-inserted, and re-running the pass with unchanged decks leaves the value unchanged
