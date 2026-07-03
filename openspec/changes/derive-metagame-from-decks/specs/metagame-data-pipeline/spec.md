## MODIFIED Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores the set of supported formats (each with a per-format last-updated timestamp) and the archetypes appearing in each format (each with its name, WUBRG color identity, and nullable signature-card art). The schema SHALL NOT store a separate per-window metagame breakdown: an archetype's metagame share is **derived at read time from the stored decks** (grouped by archetype within a window's date range). There SHALL be no `metagame_snapshots` table, no per-(format, window) freshness table, and no `meta_window` column.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) each exist and can hold a per-format last-updated timestamp

#### Scenario: Archetype row carries name, color identity, and art
- **WHEN** an archetype exists for a format
- **THEN** its row records the archetype name, its WUBRG color identity (which may be empty for colorless), and its nullable signature-card art columns

#### Scenario: No stored breakdown or window key
- **WHEN** the schema is applied to the database
- **THEN** there is no metagame-snapshot table, no per-window freshness table, and no `meta_window` column — the metagame breakdown is computed from the decks at read time

### Requirement: Public read-only access
The system SHALL expose the metagame data — formats, archetypes, events, decks, and deck cards — for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role. Writes SHALL only be possible with the service-role key used by the data pipeline.

#### Scenario: Anonymous role can read
- **WHEN** a browser client using the anon key queries a format's archetypes and decks
- **THEN** it receives the rows

#### Scenario: Anonymous role cannot write
- **WHEN** a client using the anon key attempts to insert, update, or delete metagame data
- **THEN** the write is rejected by RLS

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access. Fixtures SHALL cover the events list (including a paginated page-2 list), event result pages, and decklists, so the event / deck / pagination parsing is verified offline.

#### Scenario: Event and decklist parsing verified from fixtures
- **WHEN** the event-list, event-decks, or decklist parser is given a saved MTGTop8 fixture
- **THEN** it returns the expected events / decks / cards without making a network request

#### Scenario: Pagination verified from a saved page-2 fixture
- **WHEN** the events-list parser is given a saved page-2 MTGTop8 events fixture
- **THEN** it returns that page's events without a network request, and a page that yields no new events halts the pagination loop

## ADDED Requirements

### Requirement: Per-format data freshness
The scraper SHALL stamp each format's `formats.last_updated_at` with the run time after a successful scrape of that format, and the frontend SHALL read that per-format timestamp for its freshness indicator. There SHALL be no per-(format, window) freshness storage.

#### Scenario: Successful scrape stamps the format timestamp
- **WHEN** the scraper completes a successful run for a format
- **THEN** that format's `last_updated_at` is set to the run time

#### Scenario: Freshness is read per format
- **WHEN** the dashboard shows a format's metagame
- **THEN** the freshness indicator reflects that format's `last_updated_at`, not a per-window timestamp

## REMOVED Requirements

### Requirement: MTGTop8 scraper populates the breakdown
**Reason**: The metagame breakdown is now derived from the scraped decks (counted per archetype within the window's date range) instead of MTGTop8's pre-aggregated breakdown, whose coarser archetype taxonomy mismatched the deck-page names and produced wrong shares / empty cards. The scraper no longer fetches, parses, or stores a separate breakdown, and the `parse_meta_breakdown` parser and `metagame_snapshots` table are removed.
**Migration**: None required — the decks needed to derive the breakdown are already scraped and stored. Applying the updated `supabase/schema.sql` (service-role) drops the `metagame_snapshots` and `format_window_freshness` tables.
