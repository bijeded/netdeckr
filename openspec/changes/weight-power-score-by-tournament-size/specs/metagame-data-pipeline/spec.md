## MODIFIED Requirements

### Requirement: Decklist data schema
The system SHALL extend the Supabase (PostgreSQL) schema to store tournament decklists linked to the existing archetypes: `events` (a MTGTop8 event with its name, date, format, source identifier, and — where MTGTop8 reports it — the tournament's player count), `decks` (an individual deck at an event, linked to its event and archetype, recording the player name and placing/result), and `deck_cards` (the cards of a deck, recording quantity, whether the card is in the mainboard or sideboard, the resolved Scryfall card identity where available, and the resolved printing's hotlinked image URL where available). The archetypes table SHALL additionally carry nullable representative-card columns (a signature card name and its hotlinked image URL). Events SHALL be uniquely identifiable so re-runs do not create duplicates. The events table SHALL carry a **nullable** integer player-count column (the tournament's size), left null when MTGTop8 does not report a size; the column is additive and requires no migration of existing rows.

#### Scenario: Schema stores events, decks, and deck cards
- **WHEN** the schema is applied to the database
- **THEN** an event can hold multiple decks, each deck belongs to one event and one archetype and records its player and placing, and each deck holds mainboard and sideboard cards with quantities

#### Scenario: Deck card records the scraped name, optional Scryfall identity, and optional image
- **WHEN** a deck card is stored
- **THEN** its row records the scraped card name, and provides nullable columns for a Scryfall canonical name, current non-foil set + collector number, and the printing's image URL — populated when the card resolves, left null on a miss

#### Scenario: Event stores tournament size when reported, null otherwise
- **WHEN** the schema is applied and an event is stored
- **THEN** it provides a nullable player-count column that holds the tournament's size when MTGTop8 reports it and is null when no size is reported

## ADDED Requirements

### Requirement: Scraper captures tournament size
The system SHALL parse each MTGTop8 event's reported player count from its event page and persist it to the event's player-count column. When an event page does not display a size, the scraper SHALL leave the column null and the run SHALL still succeed. Re-scraping an already-stored event SHALL idempotently update the player count when it becomes available or changes, and SHALL NOT overwrite a previously recorded size with null. Parsing SHALL be unit-tested against saved fixtures without making a network request.

#### Scenario: Player count parsed and stored when present
- **WHEN** the scraper parses an event page that displays a player count
- **THEN** the event row's player-count column stores that integer

#### Scenario: Missing player count leaves the column null
- **WHEN** the scraper parses an event page that does not display a player count
- **THEN** the event's player-count column is left null and the scrape run still completes successfully

#### Scenario: Re-scrape updates size but never nulls a known size
- **WHEN** the scraper re-processes an event whose size is now reported (or has changed), or whose page no longer shows a size that was previously stored
- **THEN** a newly available or changed size updates the stored value, and an absent size does not overwrite a previously recorded player count with null

#### Scenario: Size parsing verified from fixtures
- **WHEN** the event-size parser is given a saved MTGTop8 event fixture with and without a displayed size
- **THEN** it returns the expected player count (or null) without making a network request
