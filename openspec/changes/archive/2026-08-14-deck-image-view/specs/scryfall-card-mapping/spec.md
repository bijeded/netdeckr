## MODIFIED Requirements

### Requirement: Deck cards are enriched with Scryfall identity
The system SHALL populate `deck_cards.scryfall_name`, `deck_cards.set_code`, `deck_cards.collector_number`, `deck_cards.image_url`, `deck_cards.small_image_url`, `deck_cards.type_line`, `deck_cards.rarity`, `deck_cards.cmc`, and `deck_cards.released_at` (the resolved printing's set release date) when writing deck cards, both for newly scraped decks and, as a one-time backfill, for rows not yet enriched with the new fields. The `small_image_url` field SHALL hold the same resolved printing's thumbnail-size hotlinked Scryfall image, sized for grid display rather than full-card reading, and SHALL be derived from the same printing as `image_url` so the two never disagree about which printing a row depicts. The `type_line`, `rarity`, `cmc`, and `released_at` fields SHALL come from the same resolved printing used for the identity columns. A resolution miss SHALL leave those columns null; the scraped `card_name` is always retained.

Because rows enriched before `small_image_url` existed already carry a non-null `image_url`, they are invisible to the existing `image_url is null` backfill sentinel. The system SHALL therefore provide a separate one-time backfill keyed on its own `small_image_url is null` sentinel, so the new column can be populated without altering or re-running the existing backfill. That pass SHALL be idempotent and SHALL leave unresolved rows null.

#### Scenario: New deck cards are written with Scryfall identity and metadata
- **WHEN** the scraper writes a deck's cards and a card resolves to a printing
- **THEN** that card row stores the canonical Scryfall name, set code, collector number, image URL, thumbnail image URL, type line, rarity, converted mana cost, and set release date alongside the scraped name

#### Scenario: Existing rows are backfilled with the new metadata
- **WHEN** the one-time `--backfill` runs over `deck_cards` rows missing the new metadata
- **THEN** rows whose card names resolve are updated with type line, rarity, cmc, and release date (plus identity columns), and unresolved rows are left null

#### Scenario: Backfill is idempotent
- **WHEN** the backfill runs again after a prior successful backfill
- **THEN** already-enriched rows are unchanged and no duplicate work corrupts existing values

#### Scenario: Thumbnail URLs are backfilled on their own sentinel
- **WHEN** the thumbnail backfill runs over `deck_cards` rows whose `small_image_url` is null but whose other Scryfall columns are already populated
- **THEN** rows whose card names resolve gain the thumbnail URL of the same printing, rows that do not resolve are left null, and the existing `image_url`-keyed backfill is unaffected

#### Scenario: Thumbnail backfill is idempotent
- **WHEN** the thumbnail backfill runs again after a prior successful run
- **THEN** rows already carrying a thumbnail URL are not rewritten and no values are corrupted

#### Scenario: Thumbnail is absent when the card does not resolve
- **WHEN** a deck card's name does not resolve to a printing
- **THEN** both `image_url` and `small_image_url` are left null and the row keeps its scraped card name

### Requirement: Existing rows can be fully re-resolved (remap)
The system SHALL provide a full re-resolution ("remap") pass over existing `deck_cards` rows that, unlike the sentinel-keyed backfills, considers every distinct `card_name` in the table (not only rows with a null column). For each distinct name that resolves to a printing under the current resolver, the pass SHALL rewrite all Scryfall columns on every row with that name — `scryfall_name`, `set_code`, `collector_number`, `image_url`, `small_image_url`, `type_line`, `rarity`, `cmc`, and `released_at` — so that later resolver, printing-selection, or metadata heuristic changes reach already-enriched rows. A name that does not resolve (a miss) SHALL be skipped entirely, leaving its existing columns untouched, so a resolution regression cannot null out good data. The pass SHALL be idempotent: with a deterministic resolver, re-running it produces the same result.

#### Scenario: Remap rewrites an already-enriched row when the resolver changes
- **WHEN** the remap pass runs and a distinct card name resolves to a printing (even for rows already carrying Scryfall data)
- **THEN** every row with that name is rewritten with the current printing's canonical name, set code, collector number, image URL, thumbnail image URL, type line, rarity, cmc, and set release date

#### Scenario: Remap never nulls out data on a miss
- **WHEN** the remap pass encounters a distinct card name that does not resolve under the current resolver
- **THEN** it does not write those rows, and their existing column values are left unchanged

#### Scenario: Remap is idempotent
- **WHEN** the remap pass runs again after a prior successful run with no resolver change
- **THEN** the rewritten values are identical and no data is corrupted
