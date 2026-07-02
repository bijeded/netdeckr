## ADDED Requirements

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
