## ADDED Requirements

### Requirement: Banned-card schema

The schema SHALL store, per format, the set of banned card names together with the date the pipeline first observed each ban (nullable, absent for bans recorded in the initial population). A card SHALL appear at most once per format. The table SHALL be readable by the anonymous (browser) role under Row Level Security and SHALL NOT be writable through it — writes SHALL only be possible with the service-role key used by the data pipeline, as for every other table.

The banned-card records SHALL be keyed by canonical card name and format code, so they can be matched against the resolved card names already stored on deck cards without any additional lookup.

#### Scenario: Schema stores per-format bans

- **WHEN** the schema is applied to the database
- **THEN** a banned-card record can be stored for a format with a card name and a nullable first-seen date, and the same card cannot be stored twice for the same format

#### Scenario: Anonymous role can read the banlist

- **WHEN** a browser client using the anon key queries a format's banned cards
- **THEN** it receives the rows

#### Scenario: Anonymous role cannot write the banlist

- **WHEN** a client using the anon key attempts to insert, update, or delete a banned-card record
- **THEN** the write is rejected by RLS

### Requirement: Pipeline refreshes the banlist each run

The pipeline SHALL refresh each format's banned-card records on every run from the card data it already downloads, adding cards that became banned, removing cards that are no longer banned, and leaving the first-seen date of an unchanged record untouched. The refresh SHALL be idempotent: two consecutive runs over unchanged card data SHALL leave the stored banlist, including its first-seen dates, identical.

The refresh SHALL NOT depend on the decklist scrape and SHALL NOT require any additional network fetch beyond the card-data sync already performed.

#### Scenario: Run reconciles the stored banlist

- **WHEN** the pipeline runs and the upstream banned set for a format differs from the stored one
- **THEN** the stored records are reconciled to match, with additions dated and removals deleted

#### Scenario: Repeat run changes nothing

- **WHEN** the pipeline runs twice over unchanged card data
- **THEN** the second run leaves every stored record and first-seen date unchanged

#### Scenario: No extra fetch

- **WHEN** the banlist is refreshed
- **THEN** it derives entirely from the already-downloaded bulk card data, with no additional request to any upstream service

## MODIFIED Requirements

### Requirement: Per-card copy-count aggregation for trending

The database SHALL expose a read-only aggregation (Postgres view or RPC) that returns, per format, per card, per board (`main`/`side`), the total copies, the count of distinct decks, and a **card category** (`creature` or `spell`) derived from the Scryfall `type_line`, over a date range derived from `events.event_date`, so the frontend can compute trending rankings (and partition the mainboard into creatures vs non-creature spells) without pulling raw `deck_cards` rows client-side. The category SHALL be `creature` when the card's `type_line` contains "Creature" and `spell` otherwise. The aggregation SHALL exclude **all lands** (basic and nonbasic — Scryfall `type_line` containing "Land"), key each card by its display name, be readable by the anon role (RLS read-only), and require no additional scraping (it reads the already-populated `deck_cards` columns).

The aggregation SHALL additionally exclude every deck that is illegal in the queried format — that is, every deck holding at least one card banned in that format, in either board. The exclusion is of the whole deck, not merely of the banned card's own rows, so an illegal deck contributes none of its cards to any count. The banned set SHALL be read from the stored per-format banlist at query time, so a banlist change takes effect immediately with no recomputation of stored data.

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

#### Scenario: Illegal decks contribute nothing

- **WHEN** a deck in the queried range holds a card banned in that format
- **THEN** none of that deck's cards appear in any count — neither the banned card nor the legal cards alongside it — and the deck is absent from every distinct-deck count

#### Scenario: Banlist change takes effect immediately

- **WHEN** a card is added to or removed from a format's stored banlist
- **THEN** the next aggregation reflects it without any backfill or recomputation of stored deck data
