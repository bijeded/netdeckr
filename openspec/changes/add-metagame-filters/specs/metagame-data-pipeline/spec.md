## MODIFIED Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores, per supported format AND per time window / event scope, a metagame breakdown: the set of formats, the archetypes appearing in each format's breakdown for each window, and for each archetype its metagame share percentage, its rank within the format+window, and its color identity. The five windows correspond to the MTGTop8 `meta` params: Last 2 Weeks (`50`), Last 5 Days (`326`), Last 2 Months (`52`), Large Events 2mo (`46`), and MTGO 2mo (`285`). Metagame snapshots SHALL be keyed by `(format_code, window, archetype_id)`. The schema SHALL also store, per format AND window, the timestamp of the most recent successful data update.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) can each hold their own metagame breakdown and last-updated timestamp

#### Scenario: Schema supports the five windows per format
- **WHEN** the schema is applied to the database
- **THEN** each format can independently hold a breakdown and a last-updated timestamp for each of the five windows (`50`, `326`, `52`, `46`, `285`), keyed by `(format_code, window, archetype_id)`

#### Scenario: Archetype row carries share, rank, and color identity
- **WHEN** an archetype belongs to a format+window's stored breakdown
- **THEN** its row records the archetype name, its metagame share percentage, its rank within that format+window, and its WUBRG color identity (which may be empty for colorless)

### Requirement: MTGTop8 scraper populates the breakdown
The system SHALL provide a scraper that, for each of the five formats and for each of the five windows, fetches the corresponding MTGTop8 `meta` archetype breakdown from `http://mtgtop8.com/format?f=<code>&meta=<window>`, parses each archetype's name, share percentage, and color identity, and upserts them into the schema with a rank assigned by descending share. On a successful run for a format+window, the scraper SHALL set that format+window's last-updated timestamp.

#### Scenario: Successful scrape stores a format+window breakdown
- **WHEN** the scraper runs for a format+window and MTGTop8 returns a valid breakdown page
- **THEN** the format+window's archetypes with their share percentages and color identities are stored, ranked by descending share, and that format+window's last-updated timestamp is set to the run time

#### Scenario: All five windows are fetched per format
- **WHEN** the scraper runs for a format
- **THEN** it fetches each of the five `meta` params (`50`, `326`, `52`, `46`, `285`) and stores a separate breakdown per window

#### Scenario: Re-run replaces the prior breakdown
- **WHEN** the scraper runs again for a format+window that already has stored data
- **THEN** that format+window's breakdown reflects the latest fetched archetypes and shares, without accumulating stale archetypes from the previous run

#### Scenario: Source failure leaves prior data intact
- **WHEN** the scraper fails to fetch or parse a format+window's page
- **THEN** that format+window's previously stored breakdown and last-updated timestamp are left unchanged

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access. Fixtures SHALL cover more than one `meta` window.

#### Scenario: Parsing verified from a saved fixture
- **WHEN** the parser is given a saved MTGTop8 breakdown fixture for a given `meta` window
- **THEN** it returns the expected archetypes with their share percentages and color identities, without making a network request
