## MODIFIED Requirements

### Requirement: Archetype representative-card art
The system SHALL store, per archetype, a representative (signature) card and both its hotlinked Scryfall normal image (`art_image_url`) and its cropped-art image (`art_crop_url`) — all nullable columns on the archetypes table. The scraper SHALL choose the archetype's signature card by ranking its stored mainboard cards and store the chosen card's images.

The signature card SHALL be chosen among the archetype's mainboard cards after excluding every card **any of whose faces is a land**. A single-faced card is excluded when its own type line contains "Land". A multi-faced card (split, transform, or modal double-faced) is excluded when the type line of **any** face contains "Land", whichever face the deck plays and whichever face's name was scraped — so a modal double-faced card with a spell front and a land back is never a signature card. This land test SHALL apply to signature-card selection only: the per-face `type_line` stored on `deck_cards` keeps describing the single face the deck plays, and no other consumer of that column changes behavior. A card whose faces are all non-land SHALL remain eligible, including a multi-faced card with no land face. A card with a null/unknown type line and no known faces SHALL NOT be excluded as a land. Among the remaining candidates, the ranking SHALL be, in strict priority order: total mainboard quantity descending, then rarity descending (mythic > rare > uncommon > common), then set release date descending (most recent first), then converted mana cost descending, then card name ascending as a final deterministic tiebreak. For any ranking criterion a null/unknown value SHALL sort last, so a card with resolved metadata outranks one without when they are otherwise tied. The archetype's own name SHALL NOT influence selection. Archetypes with no eligible candidate, or whose chosen card does not resolve to a printing, SHALL leave the art columns null. The computation SHALL run at scrape time and be available to a one-time backfill for existing archetypes.

#### Scenario: Nonbasic land is excluded from signature selection
- **WHEN** an archetype's highest-quantity mainboard card is a nonbasic land (its type line contains "Land")
- **THEN** that land is not chosen and the highest-ranked non-land card becomes the signature card

#### Scenario: Modal double-faced card with a land back is excluded
- **WHEN** an archetype's highest-ranked mainboard candidate is a modal double-faced card whose front face is a spell and whose back face is a land, and the stored per-face `type_line` names only the spell face
- **THEN** that card is not chosen as the signature card, and the highest-ranked card with no land face becomes the signature card

#### Scenario: Multi-faced card without a land face stays eligible
- **WHEN** an archetype's highest-ranked mainboard candidate is a multi-faced card none of whose faces is a land
- **THEN** it is eligible and can be chosen as the signature card

#### Scenario: Land exclusion does not change other type-line consumers
- **WHEN** a card with a land face appears in an archetype's decks
- **THEN** its stored `deck_cards.type_line` still describes only the face the deck plays, and its classification everywhere outside signature selection is unchanged

#### Scenario: Archetype name does not influence selection
- **WHEN** an archetype's name matches a card in its decks that does not rank highest
- **THEN** the ranking is unaffected by the name and the highest-ranked eligible card is still chosen

#### Scenario: Ties broken by rarity, set recency, then mana cost
- **WHEN** two eligible cards are tied on total mainboard quantity
- **THEN** the one with the higher rarity wins; if still tied, the one from the more recent set; if still tied, the higher converted mana cost; if still tied, the alphabetically-first card name

#### Scenario: Unresolved metadata sorts last
- **WHEN** two eligible cards are tied on quantity and one has null rarity/set-date/cmc
- **THEN** the card with resolved metadata is chosen, and selection remains deterministic

#### Scenario: Archetype gets its signature card's art
- **WHEN** the scraper has stored an archetype's decks and its chosen signature card resolves to a printing
- **THEN** that archetype row records the signature card name, the printing's normal image URL, and the printing's cropped-art URL

#### Scenario: Archetype without a resolvable card stays null
- **WHEN** no eligible signature card can be chosen or resolved for an archetype
- **THEN** the archetype's art columns are left null and the frontend falls back to the placeholder
