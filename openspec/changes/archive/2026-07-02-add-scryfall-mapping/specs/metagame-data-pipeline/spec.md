## MODIFIED Requirements

### Requirement: Scraper populates decklists
The system SHALL extend the scraper to fetch, for each supported format and window, every event MTGTop8 lists for that window and all of the individual decklists of those events, parse each deck's player, placing (all finishes, not only Top 4), archetype, and mainboard/sideboard cards, and upsert the results into the events, decks, and deck_cards tables. Deck cards SHALL be stored with their scraped card name and, when the name resolves against the synced Scryfall bulk data, enriched with the canonical Scryfall name and a current non-foil set + collector number (a resolution miss leaves those columns null). Storing the complete set of events and decks — not a top-finish subset — ensures the data needed for later event and archetype filters is available. Each deck's event date SHALL be stored so the frontend can order by recency. The upsert SHALL be idempotent so re-running for the same events does not create duplicate events or decks.

#### Scenario: Successful scrape stores all events and decks with placing and date
- **WHEN** the scraper runs and MTGTop8 returns valid event and decklist pages for a format and window
- **THEN** every event (with its date), all of its decks (with player, placing, and archetype), and each deck's mainboard and sideboard cards are stored — including decks that finished worse than Top 4 — so both the latest-lists fallback and later filters have complete data

#### Scenario: Deck cards are enriched with Scryfall identity when resolvable
- **WHEN** the scraper writes a deck's cards and a card name resolves against the synced Scryfall bulk data
- **THEN** that card row stores the canonical Scryfall name, set code, and collector number alongside the scraped name, and unresolved cards keep null Scryfall columns

#### Scenario: Re-run does not duplicate events or decks
- **WHEN** the scraper runs again over events it has already stored
- **THEN** those events and decks are not duplicated

#### Scenario: Decklist parsing verified from fixtures
- **WHEN** the decklist parser is given a saved MTGTop8 event/decklist fixture
- **THEN** it returns the expected decks with their players, placings, and mainboard/sideboard cards, without making a network request
