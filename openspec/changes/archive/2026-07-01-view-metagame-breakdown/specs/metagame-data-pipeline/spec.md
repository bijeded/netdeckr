## ADDED Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores, per supported format, the "Last 2 Weeks" metagame breakdown: the set of formats, the archetypes appearing in each format's breakdown, and for each archetype its metagame share percentage, its rank within the format, and its color identity. The schema SHALL also store, per format, the timestamp of the most recent successful data update.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) can each hold their own metagame breakdown and last-updated timestamp

#### Scenario: Archetype row carries share, rank, and color identity
- **WHEN** an archetype belongs to a format's stored breakdown
- **THEN** its row records the archetype name, its metagame share percentage, its rank within that format, and its WUBRG color identity (which may be empty for colorless)

### Requirement: Public read-only access
The system SHALL expose the metagame data for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role. Writes SHALL only be possible with the service-role key used by the data pipeline.

#### Scenario: Anonymous role can read
- **WHEN** a browser client using the anon key queries a format's stored breakdown
- **THEN** it receives the archetype rows for that format

#### Scenario: Anonymous role cannot write
- **WHEN** a client using the anon key attempts to insert, update, or delete metagame data
- **THEN** the write is rejected by RLS

### Requirement: MTGTop8 scraper populates the breakdown
The system SHALL provide a scraper that, for each of the five formats, fetches the MTGTop8 `meta=50` (Last 2 Weeks) archetype breakdown from `http://mtgtop8.com/format?f=<code>&meta=50`, parses each archetype's name, share percentage, and color identity, and upserts them into the schema with a rank assigned by descending share. On a successful run for a format, the scraper SHALL set that format's last-updated timestamp.

#### Scenario: Successful scrape stores a format's breakdown
- **WHEN** the scraper runs for a format and MTGTop8 returns a valid breakdown page
- **THEN** the format's archetypes with their share percentages and color identities are stored, ranked by descending share, and the format's last-updated timestamp is set to the run time

#### Scenario: Re-run replaces the prior breakdown
- **WHEN** the scraper runs again for a format that already has stored data
- **THEN** the format's breakdown reflects the latest fetched archetypes and shares, without accumulating stale archetypes from the previous run

#### Scenario: Source failure leaves prior data intact
- **WHEN** the scraper fails to fetch or parse a format's page
- **THEN** that format's previously stored breakdown and last-updated timestamp are left unchanged

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access.

#### Scenario: Parsing verified from a saved fixture
- **WHEN** the parser is given a saved MTGTop8 `meta=50` breakdown fixture
- **THEN** it returns the expected archetypes with their share percentages and color identities, without making a network request

### Requirement: Scheduled daily execution
The scraper SHALL run on the existing daily GitHub Actions cron, authenticating to Supabase with the service-role key provided via repository secrets.

#### Scenario: Daily cron runs the scraper
- **WHEN** the daily pipeline workflow executes
- **THEN** the scraper runs for all five formats using the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets
