## MODIFIED Requirements

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

## ADDED Requirements

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
