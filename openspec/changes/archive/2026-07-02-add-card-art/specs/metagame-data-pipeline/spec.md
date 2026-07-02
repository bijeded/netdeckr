## MODIFIED Requirements

### Requirement: Decklist data schema
The system SHALL extend the Supabase (PostgreSQL) schema to store tournament decklists linked to the existing archetypes: `events` (a MTGTop8 event with its name, date, format, and source identifier), `decks` (an individual deck at an event, linked to its event and archetype, recording the player name and placing/result), and `deck_cards` (the cards of a deck, recording quantity, whether the card is in the mainboard or sideboard, the resolved Scryfall card identity where available, and the resolved printing's hotlinked image URL where available). Events SHALL be uniquely identifiable so re-runs do not create duplicates.

#### Scenario: Schema stores events, decks, and deck cards
- **WHEN** the schema is applied to the database
- **THEN** an event can hold multiple decks, each deck belongs to one event and one archetype and records its player and placing, and each deck holds mainboard and sideboard cards with quantities

#### Scenario: Deck card records the scraped name, optional Scryfall identity, and optional image
- **WHEN** a deck card is stored
- **THEN** its row records the scraped card name, and provides nullable columns for a Scryfall canonical name, current non-foil set + collector number, and the printing's image URL — populated when the card resolves, left null on a miss

## ADDED Requirements

### Requirement: Archetype representative-card art
The system SHALL store, per archetype, a representative card and its hotlinked Scryfall image (nullable columns on the archetypes table). The scraper SHALL choose the archetype's most-played non-land card across its stored decks as the representative card and store that card's image URL, so the frontend can show real art on the archetype card. Archetypes with no resolvable representative card SHALL leave these columns null. The computation SHALL run at scrape time and be available to a one-time backfill for existing archetypes.

#### Scenario: Archetype gets its most-played card's art
- **WHEN** the scraper has stored an archetype's decks and its most-played non-land card resolves to a printing
- **THEN** that archetype row records the representative card name and the printing's image URL

#### Scenario: Archetype without a resolvable card stays null
- **WHEN** no representative card can be chosen or resolved for an archetype
- **THEN** the archetype's art columns are left null and the frontend falls back to the placeholder
