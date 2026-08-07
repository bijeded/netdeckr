# scryfall-card-mapping

## Purpose

Sync Scryfall bulk card data and resolve scraped MTGTop8 card names to their canonical Scryfall printing (canonical name + a current non-foil paper set code + collector number), populating the `deck_cards` Scryfall columns both at scrape time and via a one-time backfill of existing rows. This upgrades MTG Arena export from raw scraped names to canonical names + printings and unblocks real card art.

## Requirements

### Requirement: Scryfall bulk data is synced and cached
The system SHALL download Scryfall's bulk card data (the `default_cards` dataset) at most once per day, cache the downloaded file locally, and reuse the cached copy on subsequent runs the same day rather than re-downloading. The sync SHALL follow Scryfall fair-use guidance: it SHALL NOT re-host card images (image URLs are hotlinked) and SHALL NOT fetch card data per-card from the REST API when the bulk file can answer the query.

The sync SHALL locate the bulk download by reading the download location advertised for the `default_cards` dataset in Scryfall's current bulk-data metadata, and SHALL accept the dataset in the encoding and container format Scryfall currently publishes — including a compressed, line-delimited payload — decoding it without requiring the entire dataset to be held in memory as a single parsed structure. The cached copy SHALL be identified in a way that distinguishes it from a cache entry written for a different encoding, so a stale entry is never read as if it were the current format.

If the advertised download location is absent from the metadata, or the downloaded dataset cannot be decoded into card records, the sync SHALL fail with an error that names the cause rather than returning an empty or partial index.

#### Scenario: Bulk file downloaded when cache is stale or absent
- **WHEN** the sync runs and no cached bulk file exists (or the cached file is older than one day)
- **THEN** it fetches the current `default_cards` bulk download from Scryfall and writes it to the local cache

#### Scenario: Cached bulk file reused when fresh
- **WHEN** the sync runs and a cached bulk file from the same day already exists
- **THEN** it uses the cached file and does not download again

#### Scenario: Compressed line-delimited dataset is decoded
- **WHEN** Scryfall publishes the `default_cards` dataset as a compressed, line-delimited payload
- **THEN** the sync decodes it and builds the card index from its records, with the same resolution results as an equivalent uncompressed dataset

#### Scenario: Cache entry from a different encoding is not reused
- **WHEN** a cached file written for a previous bulk-data encoding is present
- **THEN** the sync does not treat it as the current day's usable cache, and downloads the current dataset instead

#### Scenario: Missing download location is an error
- **WHEN** Scryfall's bulk-data metadata contains no download location for `default_cards`
- **THEN** the sync fails with an error identifying the missing download location, and does not return an index

### Requirement: An unavailable card index fails the run
Card enrichment SHALL NOT be silently skipped. When a scrape run cannot obtain a usable Scryfall card index, the run SHALL fail with a non-zero exit status and an error naming the underlying cause, and SHALL NOT write `deck_cards` rows whose Scryfall columns are left null solely because no index was available.

Maintenance modes that require an index (backfill, remap, archetype art and colour-identity refresh) SHALL likewise fail rather than report success when no index is available.

#### Scenario: Bulk sync failure aborts the scrape
- **WHEN** the Scryfall bulk sync fails for any reason during a scrape run
- **THEN** the run exits non-zero with an error describing the failure, and no unenriched deck-card rows are written as a result of the missing index

#### Scenario: Enriched rows are written when the index is available
- **WHEN** the Scryfall bulk sync succeeds
- **THEN** scraped deck cards are written with their Scryfall identity and image columns populated for every name that resolves

#### Scenario: Maintenance mode without an index fails
- **WHEN** a backfill, remap, or archetype art/colour-identity refresh runs and no card index can be built
- **THEN** the mode exits non-zero with an error rather than completing as a no-op

### Requirement: Scraped card names resolve to canonical Scryfall printings
The system SHALL build an index from the bulk data that maps a card name to its canonical Scryfall identity: the canonical card `name`, a non-foil printing's `set_code` and `collector_number`, the printing's `normal`-size image URL (hotlinked from Scryfall's CDN, for card-art display; a multi-face card lacking a top-level image uses the front face's), and additionally the printing's cropped-art (`art_crop`) URL, `type_line`, `rarity`, `cmc`, and set release date (`released_at`) so callers can persist card metadata and choose representative art.

A printing whose `layout` is `reversible_card` SHALL NOT be an eligible candidate for any card. Such printings carry no top-level `type_line` or `cmc`, and are indexed under a doubled name (`"<name> // <name>"`) that would otherwise never be ranked against the plain card's printings — making selection depend on bulk-file ordering and allowing a printing with null metadata to be chosen. Ineligibility SHALL be absolute rather than a ranking demotion, so a `reversible_card` printing is rejected even when it is the only paper printing of that card.

When a card has several eligible non-foil paper printings, the system SHALL choose the printing that most closely resembles a plain, standard printing, ranking candidates by the following priorities in order:
1. **Plain treatment first.** A plain printing SHALL be preferred over any special-treatment printing. A printing is special-treatment if it is a promo, carries `boosterfun` in its promo types, is `full_art`, is `textless`, has `border_color` equal to `borderless`, or carries a `showcase`, `extendedart`, or `inverted` frame effect. Plain treatment SHALL take precedence over both set type and recency (a plain printing in an older set beats a special-treatment printing in a newer set). Border colors other than `borderless` (e.g. black, white, silver, gold) SHALL NOT by themselves make a printing special-treatment. A Universes Beyond crossover marker SHALL NOT by itself make a printing special-treatment: on a wholly-Universes-Beyond set every printing carries it, so it cannot distinguish the plain printing from its alternate-treatment variants; those variants are distinguished by `boosterfun` and the other markers above.
2. **Preferred set types next.** Among printings tied on treatment, the system SHALL prefer a printing from an `expansion` or `core` set over a neutral set type, and SHALL demote `commander`, `draft_innovation`, and `box` set types below neutral ones. The `masters` set type SHALL be neutral: reprint and draft-product sets SHALL NOT outrank a real expansion or core printing on recency alone.
3. **Most recent next.** Among printings tied on treatment and set-type tier, the system SHALL prefer the most recent set release date.
4. **Stable tiebreak.** Set code SHALL be used as a final deterministic tiebreak so selection is independent of bulk-file ordering.

Resolution SHALL match the scraped card name to a Scryfall card name, tolerating the split/double-faced card naming MTGTop8 emits (including its single-slash separator, e.g. resolving `Fire / Ice` or a front-face-only name to the full `Fire // Ice` card). When a scraped name has no confident match, resolution SHALL return no printing (a miss) rather than an incorrect one.

#### Scenario: Known card resolves to a printing
- **WHEN** a scraped card name matches a Scryfall card
- **THEN** resolution returns the canonical name, a non-foil set code, a collector number, the printing's image URL, and the printing's cropped-art URL, type line, rarity, converted mana cost, and set release date

#### Scenario: Reversible printings are never selected
- **WHEN** a card has a plain printing plus a `reversible_card` printing whose `type_line` and `cmc` are null
- **THEN** resolution returns the plain printing, and the resolved type line and converted mana cost are non-null regardless of the order the printings appear in the bulk data

#### Scenario: A card whose only printing is reversible is a miss
- **WHEN** a card's only eligible-looking paper printing has layout `reversible_card`
- **THEN** resolution returns no printing rather than one with a null type line

#### Scenario: Plain printing preferred over promo or crossover
- **WHEN** a card has a plain non-foil printing plus a newer promo or Universes Beyond crossover printing
- **THEN** resolution returns the plain printing's set code and collector number, not the promo or crossover variant

#### Scenario: Plain printing preferred over borderless, showcase, extended-art, full-art, or textless
- **WHEN** a card has a plain non-foil printing plus a special-treatment printing (`full_art`, `textless`, `borderless` border color, or a `showcase`/`extendedart`/`inverted` frame effect), even in the same or a newer set
- **THEN** resolution returns the plain printing's set code, collector number, image URL, and cropped-art URL, not the special-treatment variant

#### Scenario: Plain printing preferred over a booster-fun variant in the same set
- **WHEN** a card has two printings in the same set with the same release date, one plain and one carrying `boosterfun` in its promo types
- **THEN** resolution returns the plain printing, not the booster-fun variant

#### Scenario: Universes Beyond marker alone does not demote a printing
- **WHEN** every printing of a card is from a wholly-Universes-Beyond set and only one of them is plain
- **THEN** resolution returns that plain printing rather than an alternate-treatment printing from the same set

#### Scenario: Plain treatment beats recency
- **WHEN** a card's only newer printings are special-treatment and an older printing is plain
- **THEN** resolution returns the older plain printing rather than a newer special-treatment printing

#### Scenario: Preferred set types beat commander and draft-innovation reprints
- **WHEN** a card has equally-plain printings in both a preferred set (`expansion` or `core`) and a `commander` or `draft_innovation` set
- **THEN** resolution returns the printing from the preferred set

#### Scenario: Preferred set types beat box-product reprints
- **WHEN** a card has equally-plain printings in both a preferred set (`expansion` or `core`) and a `box` set such as a Secret Lair drop
- **THEN** resolution returns the printing from the preferred set

#### Scenario: Masters reprints do not outrank an expansion printing
- **WHEN** a card has a plain `expansion` printing and a plain, more recent `masters` printing
- **THEN** resolution returns the `expansion` printing

#### Scenario: Demoted set types are still selected when nothing else exists
- **WHEN** a card's only eligible printing is from a `box`, `commander`, or `draft_innovation` set
- **THEN** resolution returns that printing rather than a miss

#### Scenario: Non-borderless border colors remain eligible
- **WHEN** a card's best plain candidate has a white, silver, or gold border and is otherwise plain
- **THEN** it is treated as plain and is not demoted for its border color

#### Scenario: Signature-card art follows the same selection
- **WHEN** an archetype's signature card is resolved to a printing for its art
- **THEN** it uses the same printing-selection ranking, so signature-card art reflects a plain printing rather than a special-treatment variant

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
