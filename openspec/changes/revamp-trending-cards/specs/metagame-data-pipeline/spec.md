## MODIFIED Requirements

### Requirement: Per-card copy-count aggregation for trending

The database SHALL expose a read-only aggregation (Postgres view or RPC) that returns, per format, per card, per board (`main`/`side`), the total copies, the count of distinct decks, and a **card category** (`creature` or `spell`) derived from the Scryfall `type_line`, over a date range derived from `events.event_date`, so the frontend can compute trending rankings (and partition the mainboard into creatures vs non-creature spells) without pulling raw `deck_cards` rows client-side. The category SHALL be `creature` when the card's `type_line` contains "Creature" and `spell` otherwise. The aggregation SHALL exclude **all lands** (basic and nonbasic — Scryfall `type_line` containing "Land"), key each card by its display name, be readable by the anon role (RLS read-only), and require no additional scraping (it reads the already-populated `deck_cards` columns).

#### Scenario: Aggregated copies per card
- **WHEN** the frontend requests trending data for a format and date range
- **THEN** it receives per-card, per-board total copies, distinct-deck counts, and a creature/spell category, with all lands excluded

#### Scenario: Category derived from type_line
- **WHEN** a card's Scryfall `type_line` contains "Creature" (including "Artifact Creature", "Enchantment Creature", etc.)
- **THEN** its aggregated row is categorized as `creature`, and every other non-land card is categorized as `spell`

#### Scenario: Anon read-only access
- **WHEN** the browser queries the aggregation with the anon key
- **THEN** the read succeeds under RLS and no write path is exposed

#### Scenario: No new scraping required
- **WHEN** the aggregation is computed
- **THEN** it derives entirely from existing `decks`, `deck_cards`, and `events` data with no change to the scraper
