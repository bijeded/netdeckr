## MODIFIED Requirements

### Requirement: Archetype representative-card art
The system SHALL store, per archetype, a representative (signature) card and both its hotlinked Scryfall normal image (`art_image_url`) and its cropped-art image (`art_crop_url`) — all nullable columns on the archetypes table. The scraper SHALL choose the archetype's signature card by ranking its stored mainboard cards and store the chosen card's images.

The signature card SHALL be chosen among the archetype's mainboard cards after excluding every card whose `type_line` contains "Land" (i.e. all lands, basic and nonbasic, including a DFC card whose land face makes its type line contain "Land"). Cards with a null/unknown `type_line` SHALL NOT be excluded as lands. Among the remaining non-land cards, the ranking SHALL be, in strict priority order: total mainboard quantity descending, then rarity descending (mythic > rare > uncommon > common), then set release date descending (most recent first), then converted mana cost descending, then card name ascending as a final deterministic tiebreak. For any ranking criterion a null/unknown value SHALL sort last, so a card with resolved metadata outranks one without when they are otherwise tied. Archetypes with no non-land candidate, or whose chosen card does not resolve to a printing, SHALL leave the art columns null. The computation SHALL run at scrape time and be available to a one-time backfill for existing archetypes.

#### Scenario: Nonbasic land is excluded from signature selection
- **WHEN** an archetype's highest-quantity mainboard card is a nonbasic land (its type line contains "Land")
- **THEN** that land is not chosen and the highest-ranked non-land card becomes the signature card

#### Scenario: Ties broken by rarity, set recency, then mana cost
- **WHEN** two non-land cards are tied on total mainboard quantity
- **THEN** the one with the higher rarity wins; if still tied, the one from the more recent set; if still tied, the higher converted mana cost; if still tied, the alphabetically-first card name

#### Scenario: Unresolved metadata sorts last
- **WHEN** two non-land cards are tied on quantity and one has null rarity/set-date/cmc
- **THEN** the card with resolved metadata is chosen, and selection remains deterministic

#### Scenario: Archetype gets its signature card's art
- **WHEN** the scraper has stored an archetype's decks and its chosen signature card resolves to a printing
- **THEN** that archetype row records the signature card name, the printing's normal image URL, and the printing's cropped-art URL

#### Scenario: Archetype without a resolvable card stays null
- **WHEN** no non-land signature card can be chosen or resolved for an archetype
- **THEN** the archetype's art columns are left null and the frontend falls back to the placeholder

## ADDED Requirements

### Requirement: One-time metadata backfill
The system SHALL provide a one-time `--backfill` scraper mode, run with the service-role key, that re-resolves existing `deck_cards` rows to populate the card-metadata columns (`type_line`, `rarity`, `cmc`, `released_at`, and any missing identity/image columns) and then recomputes every archetype's signature card, `art_image_url`, and `art_crop_url` from the refreshed data. The backfill SHALL be idempotent.

#### Scenario: Backfill fills metadata and recomputes art
- **WHEN** `--backfill` runs over deck cards missing the metadata columns
- **THEN** rows whose names resolve gain their type line, rarity, cmc, and set release date, and each archetype's signature card and art are recomputed from the refreshed rows

#### Scenario: Backfill is idempotent
- **WHEN** `--backfill` runs again after a prior successful backfill
- **THEN** already-enriched rows are unchanged and recomputed art matches the prior result
