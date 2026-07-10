## ADDED Requirements

### Requirement: Per-card copy-count aggregation for trending

The database SHALL expose a read-only aggregation (Postgres view or RPC) that returns, per format, per card, per board (`main`/`side`), the total copies and the count of distinct decks over a date range derived from `events.event_date`, so the frontend can compute trending copy share without pulling raw `deck_cards` rows client-side. The aggregation SHALL exclude basic lands (Scryfall `type_line` containing "Basic Land"), key each card by its display name, be readable by the anon role (RLS read-only), and require no additional scraping (it reads the already-populated `deck_cards` columns).

#### Scenario: Aggregated copies per card
- **WHEN** the frontend requests trending data for a format and date range
- **THEN** it receives per-card, per-board total copies (and distinct-deck counts) suitable for computing copy share, with basic lands excluded

#### Scenario: Anon read-only access
- **WHEN** the browser queries the aggregation with the anon key
- **THEN** the read succeeds under RLS and no write path is exposed

#### Scenario: No new scraping required
- **WHEN** the aggregation is computed
- **THEN** it derives entirely from existing `decks`, `deck_cards`, and `events` data with no change to the scraper
