# metagame-data-pipeline

## Purpose
The Supabase schema (formats, archetypes, metagame snapshots, per-window freshness) and the MTGTop8 scraper that populates the archetype breakdown for all five formats across the three logical time windows (`5days`, `2weeks`, `2months`), run daily via GitHub Actions and readable read-only by the browser.

## Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores, per supported format AND per time window, a metagame breakdown: the set of formats, the archetypes appearing in each format's breakdown for each window, and for each archetype its metagame share percentage, its rank within the format+window, and its color identity. The windows SHALL be stored as format-independent logical keys — `5days`, `2weeks`, `2months` — the three time windows MTGTop8 offers, with the same meaning, for every format. Metagame snapshots SHALL be keyed by `(format_code, meta_window, archetype_id)`, and `meta_window` SHALL be constrained to the logical keys. The schema SHALL also store, per format AND window, the timestamp of the most recent successful data update.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) can each hold their own metagame breakdown and last-updated timestamp

#### Scenario: Schema supports the three logical windows per format
- **WHEN** the schema is applied to the database
- **THEN** each format can independently hold a breakdown and a last-updated timestamp for each of the three logical windows (`5days`, `2weeks`, `2months`), keyed by `(format_code, meta_window, archetype_id)`, with `meta_window` constrained to those keys

#### Scenario: Archetype row carries share, rank, and color identity
- **WHEN** an archetype belongs to a format+window's stored breakdown
- **THEN** its row records the archetype name, its metagame share percentage, its rank within that format+window, and its WUBRG color identity (which may be empty for colorless)

### Requirement: Public read-only access
The system SHALL expose the metagame data for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role. Writes SHALL only be possible with the service-role key used by the data pipeline.

#### Scenario: Anonymous role can read
- **WHEN** a browser client using the anon key queries a format's stored breakdown
- **THEN** it receives the archetype rows for that format

#### Scenario: Anonymous role cannot write
- **WHEN** a client using the anon key attempts to insert, update, or delete metagame data
- **THEN** the write is rejected by RLS

### Requirement: MTGTop8 scraper populates the breakdown
The system SHALL provide a scraper that, for each of the five formats and for each of the three logical windows, resolves the window to that format's MTGTop8 `meta` param ID (which is per-format), fetches the corresponding archetype breakdown from `http://mtgtop8.com/format?f=<code>&meta=<id>`, parses each archetype's name, share percentage, and color identity, and upserts them into the schema keyed by the logical window with a rank assigned by descending share. On a successful run for a format+window, the scraper SHALL set that format+window's last-updated timestamp.

#### Scenario: Successful scrape stores a format+window breakdown
- **WHEN** the scraper runs for a format+window and MTGTop8 returns a valid breakdown page
- **THEN** the format+window's archetypes with their share percentages and color identities are stored under the logical window key, ranked by descending share, and that format+window's last-updated timestamp is set to the run time

#### Scenario: Window is resolved to the per-format meta ID
- **WHEN** the scraper fetches a `(format, logical window)` pair
- **THEN** it uses that format's own MTGTop8 `meta` ID for the window (e.g. `2weeks` is `50` for Standard but `54` for Modern), so each format returns its own distinct data per window

#### Scenario: All three windows are fetched per format
- **WHEN** the scraper runs for a format
- **THEN** it fetches each of the three logical windows (`5days`, `2weeks`, `2months`) and stores a separate breakdown per window

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

### Requirement: Scheduled daily execution
The scraper SHALL run on the existing daily GitHub Actions cron, authenticating to Supabase with the service-role key provided via repository secrets.

#### Scenario: Daily cron runs the scraper
- **WHEN** the daily pipeline workflow executes
- **THEN** the scraper runs for all five formats using the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets
