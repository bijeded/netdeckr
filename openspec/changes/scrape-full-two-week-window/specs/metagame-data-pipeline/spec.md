## MODIFIED Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores, per supported format AND per time window, a metagame breakdown: the set of formats, the archetypes appearing in each format's breakdown for each window, and for each archetype its metagame share percentage, its rank within the format+window, and its color identity. The windows SHALL be stored as format-independent logical keys — `5days` and `2weeks` — the time windows the dashboard offers, with the same meaning, for every format. Metagame snapshots SHALL be keyed by `(format_code, meta_window, archetype_id)`. The schema SHALL also store, per format AND window, the timestamp of the most recent successful data update.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) can each hold their own metagame breakdown and last-updated timestamp

#### Scenario: Schema supports the logical windows per format
- **WHEN** the schema is applied to the database
- **THEN** each format can independently hold a breakdown and a last-updated timestamp for each logical window (`5days`, `2weeks`), keyed by `(format_code, meta_window, archetype_id)`

#### Scenario: Archetype row carries share, rank, and color identity
- **WHEN** an archetype belongs to a format+window's stored breakdown
- **THEN** its row records the archetype name, its metagame share percentage, its rank within that format+window, and its WUBRG color identity (which may be empty for colorless)

### Requirement: MTGTop8 scraper populates the breakdown
The system SHALL provide a scraper that, for each of the five formats and for each of the two logical windows (`5days`, `2weeks`), resolves the window to that format's MTGTop8 `meta` param ID (which is per-format), fetches the corresponding archetype breakdown from `http://mtgtop8.com/format?f=<code>&meta=<id>`, parses each archetype's name, share percentage, and color identity, and upserts them into the schema keyed by the logical window with a rank assigned by descending share. On a successful run for a format+window, the scraper SHALL set that format+window's last-updated timestamp.

#### Scenario: Successful scrape stores a format+window breakdown
- **WHEN** the scraper runs for a format+window and MTGTop8 returns a valid breakdown page
- **THEN** the format+window's archetypes with their share percentages and color identities are stored under the logical window key, ranked by descending share, and that format+window's last-updated timestamp is set to the run time

#### Scenario: Window is resolved to the per-format meta ID
- **WHEN** the scraper fetches a `(format, logical window)` pair
- **THEN** it uses that format's own MTGTop8 `meta` ID for the window (e.g. `2weeks` is `50` for Standard but `54` for Modern), so each format returns its own distinct data per window

#### Scenario: Both windows are fetched per format
- **WHEN** the scraper runs for a format
- **THEN** it fetches each of the two logical windows (`5days`, `2weeks`) and stores a separate breakdown per window, and does not fetch or store a `2months` breakdown

#### Scenario: Re-run replaces the prior breakdown
- **WHEN** the scraper runs again for a format+window that already has stored data
- **THEN** that format+window's breakdown reflects the latest fetched archetypes and shares, without accumulating stale archetypes from the previous run

#### Scenario: Source failure leaves prior data intact
- **WHEN** the scraper fails to fetch or parse a format+window's page
- **THEN** that format+window's previously stored breakdown and last-updated timestamp are left unchanged

### Requirement: Scraper populates decklists
The system SHALL extend the scraper to fetch, for each supported format, every event MTGTop8 lists in the **two-week window** (which contains the last-five-days events as a date subset) by following **every page** of that window's events list (`&cp=2`, `&cp=3`, …) until a page yields no new events, and to fetch all of the individual decklists of those events, parse each deck's player, placing (all finishes, not only Top 4), archetype, and mainboard/sideboard cards, and upsert the results into the events, decks, and deck_cards tables. Deck cards SHALL be stored with their scraped card name and, when the name resolves against the synced Scryfall bulk data, enriched with the canonical Scryfall name and a current non-foil set + collector number (a resolution miss leaves those columns null). Storing the complete set of events and decks — not a top-finish subset — ensures the data needed for later event and archetype filters is available. Each deck's event date SHALL be stored so the frontend can order by recency and scope by time window. The upsert SHALL be idempotent so re-running for the same events does not create duplicate events or decks.

#### Scenario: Successful scrape stores all events and decks with placing and date
- **WHEN** the scraper runs and MTGTop8 returns valid event and decklist pages for a format's two-week window
- **THEN** every event (with its date), all of its decks (with player, placing, and archetype), and each deck's mainboard and sideboard cards are stored — including decks that finished worse than Top 4 — so both the latest-lists fallback and later filters have complete data

#### Scenario: All pages of the events list are fetched
- **WHEN** the scraper gathers a format's events for the two-week window and MTGTop8 paginates them across multiple pages
- **THEN** it follows each subsequent page (`&cp=2`, `&cp=3`, …) until a page yields no new events (or a safety page cap is reached), so events beyond the first page are also stored and deduped against events already gathered or already in the database

#### Scenario: Deck cards are enriched with Scryfall identity when resolvable
- **WHEN** the scraper writes a deck's cards and a card name resolves against the synced Scryfall bulk data
- **THEN** that card row stores the canonical Scryfall name, set code, and collector number alongside the scraped name, and unresolved cards keep null Scryfall columns

#### Scenario: Re-run does not duplicate events or decks
- **WHEN** the scraper runs again over events it has already stored
- **THEN** those events and decks are not duplicated

#### Scenario: Decklist parsing verified from fixtures
- **WHEN** the decklist parser is given a saved MTGTop8 event/decklist fixture
- **THEN** it returns the expected decks with their players, placings, and mainboard/sideboard cards, without making a network request

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access. Fixtures SHALL cover more than one `meta` window and SHALL include a paginated (page-2) events list so the pagination logic is verified offline.

#### Scenario: Parsing verified from a saved fixture
- **WHEN** the parser is given a saved MTGTop8 breakdown fixture for a given `meta` window
- **THEN** it returns the expected archetypes with their share percentages and color identities, without making a network request

#### Scenario: Pagination verified from a saved page-2 fixture
- **WHEN** the events-list parser is given a saved page-2 MTGTop8 events fixture
- **THEN** it returns that page's events without a network request, and a page that yields no new events halts the pagination loop

### Requirement: Decklist retention
The system SHALL apply a 30-day retention policy to decklist data, pruning events (and their decks and deck cards) older than 30 days during the daily run.

#### Scenario: Old decklists are pruned
- **WHEN** the daily prune step runs and events older than 30 days exist
- **THEN** those events and their associated decks and deck cards are removed
