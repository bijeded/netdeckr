## MODIFIED Requirements

### Requirement: Deck cards are enriched with Scryfall identity
The system SHALL populate `deck_cards.scryfall_name`, `deck_cards.set_code`, `deck_cards.collector_number`, `deck_cards.image_url`, `deck_cards.type_line`, `deck_cards.rarity`, `deck_cards.cmc`, and `deck_cards.released_at` (the resolved printing's set release date) when writing deck cards, both for newly scraped decks and, as a one-time backfill, for rows not yet enriched with the new fields. The `type_line`, `rarity`, `cmc`, and `released_at` fields SHALL come from the same resolved printing used for the identity columns. A resolution miss SHALL leave those columns null; the scraped `card_name` is always retained.

#### Scenario: New deck cards are written with Scryfall identity and metadata
- **WHEN** the scraper writes a deck's cards and a card resolves to a printing
- **THEN** that card row stores the canonical Scryfall name, set code, collector number, image URL, type line, rarity, converted mana cost, and set release date alongside the scraped name

#### Scenario: Existing rows are backfilled with the new metadata
- **WHEN** the one-time `--backfill` runs over `deck_cards` rows missing the new metadata
- **THEN** rows whose card names resolve are updated with type line, rarity, cmc, and release date (plus identity columns), and unresolved rows are left null

#### Scenario: Backfill is idempotent
- **WHEN** the backfill runs again after a prior successful backfill
- **THEN** already-enriched rows are unchanged and no duplicate work corrupts existing values

### Requirement: Scraped card names resolve to canonical Scryfall printings
The system SHALL build an index from the bulk data that maps a card name to its canonical Scryfall identity: the canonical card `name`, a non-foil printing's `set_code` and `collector_number`, the printing's `normal`-size image URL (hotlinked from Scryfall's CDN, for card-art display; a multi-face card lacking a top-level image uses the front face's), and additionally the printing's cropped-art (`art_crop`) URL, `type_line`, `rarity`, `cmc`, and set release date (`released_at`) so callers can persist card metadata and choose representative art. When a card has several non-foil paper printings, the system SHALL prefer a standard printing — one that is neither a promo nor a Universes Beyond crossover — over a special one, and among equally-standard printings the most recent, so the exported set/collector and the image reflect a clean printing rather than a promo variant. Resolution SHALL match the scraped card name to a Scryfall card name, tolerating the split/double-faced card naming MTGTop8 emits (including its single-slash separator, e.g. resolving `Fire / Ice` or a front-face-only name to the full `Fire // Ice` card). When a scraped name has no confident match, resolution SHALL return no printing (a miss) rather than an incorrect one.

#### Scenario: Known card resolves to a printing
- **WHEN** a scraped card name matches a Scryfall card
- **THEN** resolution returns the canonical name, a non-foil set code, a collector number, the printing's image URL, and the printing's cropped-art URL, type line, rarity, converted mana cost, and set release date

#### Scenario: Standard printing preferred over a promo or crossover
- **WHEN** a card has a standard non-foil printing plus a newer promo or Universes Beyond crossover printing
- **THEN** resolution returns the standard printing's set code and collector number, not the promo or crossover variant

#### Scenario: Split or double-faced name resolves to the full card
- **WHEN** a scraped card name is a front-face-only, single-slash, or partial form of a multi-face Scryfall card
- **THEN** resolution returns the full card's canonical identity

#### Scenario: Unknown card is a miss
- **WHEN** a scraped card name matches no Scryfall card
- **THEN** resolution returns no printing and the caller leaves the Scryfall columns null
