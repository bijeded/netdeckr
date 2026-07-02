## ADDED Requirements

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
