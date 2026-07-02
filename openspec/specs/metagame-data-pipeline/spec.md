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

### Requirement: Decklist data schema
The system SHALL extend the Supabase (PostgreSQL) schema to store tournament decklists linked to the existing archetypes: `events` (a MTGTop8 event with its name, date, format, and source identifier), `decks` (an individual deck at an event, linked to its event and archetype, recording the player name and placing/result), and `deck_cards` (the cards of a deck, recording quantity, whether the card is in the mainboard or sideboard, and the resolved Scryfall card identity where available). Events SHALL be uniquely identifiable so re-runs do not create duplicates.

#### Scenario: Schema stores events, decks, and deck cards
- **WHEN** the schema is applied to the database
- **THEN** an event can hold multiple decks, each deck belongs to one event and one archetype and records its player and placing, and each deck holds mainboard and sideboard cards with quantities

#### Scenario: Deck card always records the scraped name, with optional Scryfall identity
- **WHEN** a deck card is stored
- **THEN** its row records the scraped card name, and it provides nullable columns for a Scryfall canonical name and current non-foil set + collector number to be populated by a later Scryfall-mapping change (left null until then)

### Requirement: Decklists are readable read-only
The system SHALL expose the events, decks, and deck-cards tables for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role.

#### Scenario: Anonymous role can read decklists
- **WHEN** a browser client using the anon key queries an archetype's decks and their cards
- **THEN** it receives the deck and card rows

#### Scenario: Anonymous role cannot write decklists
- **WHEN** a client using the anon key attempts to insert, update, or delete events, decks, or deck cards
- **THEN** the write is rejected by RLS

### Requirement: Scraper populates decklists
The system SHALL extend the scraper to fetch, for each supported format and window, every event MTGTop8 lists for that window and all of the individual decklists of those events, parse each deck's player, placing (all finishes, not only Top 4), archetype, and mainboard/sideboard cards, and upsert the results into the events, decks, and deck_cards tables. Deck cards SHALL be stored with their scraped card name; mapping cards to Scryfall printings is out of scope for this change (a later Scryfall-mapping change populates the nullable Scryfall columns). Storing the complete set of events and decks — not a top-finish subset — ensures the data needed for later event and archetype filters is available. Each deck's event date SHALL be stored so the frontend can order by recency. The upsert SHALL be idempotent so re-running for the same events does not create duplicate events or decks.

#### Scenario: Successful scrape stores all events and decks with placing and date
- **WHEN** the scraper runs and MTGTop8 returns valid event and decklist pages for a format and window
- **THEN** every event (with its date), all of its decks (with player, placing, and archetype), and each deck's mainboard and sideboard cards are stored — including decks that finished worse than Top 4 — so both the latest-lists fallback and later filters have complete data

#### Scenario: Re-run does not duplicate events or decks
- **WHEN** the scraper runs again over events it has already stored
- **THEN** those events and decks are not duplicated

#### Scenario: Decklist parsing verified from fixtures
- **WHEN** the decklist parser is given a saved MTGTop8 event/decklist fixture
- **THEN** it returns the expected decks with their players, placings, and mainboard/sideboard cards, without making a network request

### Requirement: Decklist retention
The system SHALL apply the existing six-month retention policy to decklist data, pruning events (and their decks and deck cards) older than six months during the daily run.

#### Scenario: Old decklists are pruned
- **WHEN** the daily prune step runs and events older than six months exist
- **THEN** those events and their associated decks and deck cards are removed

### Requirement: Incremental decklist scraping
The system SHALL scrape decklists incrementally: when gathering a format's events, it SHALL skip events whose source event id is already stored, fetching the results list and per-deck decklist pages only for events not yet in the database. This keeps daily runs cheap after the initial backfill (a past event's decklists do not change) while still storing the complete set of events over time.

#### Scenario: Already-stored events are skipped
- **WHEN** the scraper gathers a format's events and some of them are already stored
- **THEN** it does not re-fetch those events' results or decklist pages, and only new events are fetched and stored

#### Scenario: New events are still scraped
- **WHEN** the scraper encounters an event whose source event id is not yet stored
- **THEN** it fetches and stores that event, its decks, and their cards

### Requirement: Scheduled daily execution
The scraper SHALL run daily via GitHub Actions, authenticating to Supabase with the service-role key provided via repository secrets. It SHALL run one job per format on staggered schedules (rather than a single job covering all formats at once) so that load on the source is spread out; each scheduled run SHALL scrape exactly one format. A manual trigger SHALL still be able to run a single format or all formats on demand.

#### Scenario: Staggered per-format schedules
- **WHEN** the daily pipeline runs on its schedule
- **THEN** each of the five formats is scraped by its own job at its own staggered time, each authenticating with the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets

#### Scenario: Manual trigger scrapes a chosen format or all
- **WHEN** the workflow is triggered manually
- **THEN** it scrapes the requested single format, or all formats when none is specified

### Requirement: Archetype identity is case-insensitive and canonical

An archetype SHALL be uniquely identified within a format by its name compared **case-insensitively**, so that the same archetype scraped from different MTGTop8 pages — which capitalize archetype names inconsistently (e.g. `UW Control` on the metagame breakdown page vs. `Uw Control` on the event decklist results table) — resolves to a single archetype row. The get-or-create upsert used by both the breakdown scrape and the decklist scrape SHALL match case-insensitively, and the schema SHALL enforce uniqueness on `(format_code, lower(name))` so no case-variant duplicate row can be created. A single human-preferred display name SHALL be stored per archetype.

#### Scenario: Case-variant name resolves to the existing archetype

- **WHEN** the scraper encounters an archetype name that differs only by capitalization from one already stored for that format (e.g. `Uw Control` when `UW Control` exists)
- **THEN** it resolves to the existing archetype row and attaches the deck/snapshot to it, without creating a second archetype row

#### Scenario: Schema rejects a case-variant duplicate

- **WHEN** an insert is attempted for a `(format_code, name)` whose lowercased name already exists for that format
- **THEN** the database uniqueness constraint prevents a duplicate archetype row

#### Scenario: Existing duplicate rows are merged

- **WHEN** the case-insensitivity migration runs against data containing case-variant duplicate archetype rows
- **THEN** each duplicate group is collapsed to one canonical row, its decks and snapshots are re-pointed to that row, and the orphaned duplicate rows are removed
