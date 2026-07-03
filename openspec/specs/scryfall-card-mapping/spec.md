# scryfall-card-mapping

## Purpose

Sync Scryfall bulk card data and resolve scraped MTGTop8 card names to their canonical Scryfall printing (canonical name + a current non-foil paper set code + collector number), populating the `deck_cards` Scryfall columns both at scrape time and via a one-time backfill of existing rows. This upgrades MTG Arena export from raw scraped names to canonical names + printings and unblocks real card art.

## Requirements

### Requirement: Scryfall bulk data is synced and cached
The system SHALL download Scryfall's bulk card data (the `default_cards` dataset) at most once per day, cache the downloaded file locally, and reuse the cached copy on subsequent runs the same day rather than re-downloading. The sync SHALL follow Scryfall fair-use guidance: it SHALL NOT re-host card images (image URLs are hotlinked) and SHALL NOT fetch card data per-card from the REST API when the bulk file can answer the query.

#### Scenario: Bulk file downloaded when cache is stale or absent
- **WHEN** the sync runs and no cached bulk file exists (or the cached file is older than one day)
- **THEN** it fetches the current `default_cards` bulk download from Scryfall and writes it to the local cache

#### Scenario: Cached bulk file reused when fresh
- **WHEN** the sync runs and a cached bulk file from the same day already exists
- **THEN** it uses the cached file and does not download again

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

### Requirement: Existing rows can be fully re-resolved (remap)
The system SHALL provide a full re-resolution ("remap") pass over existing `deck_cards` rows that, unlike the sentinel-keyed backfills, considers every distinct `card_name` in the table (not only rows with a null column). For each distinct name that resolves to a printing under the current resolver, the pass SHALL rewrite all Scryfall columns on every row with that name — `scryfall_name`, `set_code`, `collector_number`, `image_url`, `type_line`, `rarity`, `cmc`, and `released_at` — so that later resolver, printing-selection, or metadata heuristic changes reach already-enriched rows. A name that does not resolve (a miss) SHALL be skipped entirely, leaving its existing columns untouched, so a resolution regression cannot null out good data. The pass SHALL be idempotent: with a deterministic resolver, re-running it produces the same result.

#### Scenario: Remap rewrites an already-enriched row when the resolver changes
- **WHEN** the remap pass runs and a distinct card name resolves to a printing (even for rows already carrying Scryfall data)
- **THEN** every row with that name is rewritten with the current printing's canonical name, set code, collector number, image URL, type line, rarity, cmc, and set release date

#### Scenario: Remap never nulls out data on a miss
- **WHEN** the remap pass encounters a distinct card name that does not resolve under the current resolver
- **THEN** it does not write those rows, and their existing column values are left unchanged

#### Scenario: Remap is idempotent
- **WHEN** the remap pass runs again after a prior successful run with no resolver change
- **THEN** the rewritten values are identical and no data is corrupted
