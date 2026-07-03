## ADDED Requirements

### Requirement: One-time Scryfall remap mode
The system SHALL provide a one-time `--remap-scryfall` scraper mode, run with the service-role key, that re-resolves every existing `deck_cards` row against the current Scryfall resolver (rewriting all Scryfall columns for each distinct resolvable name, skipping misses) and then recomputes every archetype's signature card, `art_image_url`, and `art_crop_url` from the refreshed rows. The mode SHALL be standalone — it SHALL NOT scrape MTGTop8 — and SHALL be invocable both from the command line and via the pipeline's `workflow_dispatch` so it can run in CI with the service-role secret.

#### Scenario: Remap mode refreshes rows and recomputes art
- **WHEN** `--remap-scryfall` runs
- **THEN** every distinct resolvable card name's rows are rewritten with the current resolver's identity/image/metadata, and each format's archetype signature card and art are recomputed from the refreshed rows

#### Scenario: Remap mode does not scrape
- **WHEN** `--remap-scryfall` runs
- **THEN** no MTGTop8 breakdown or decklist pages are fetched; only existing rows are re-resolved

#### Scenario: Remap mode requires the resolver
- **WHEN** `--remap-scryfall` runs but the Scryfall bulk sync is unavailable
- **THEN** the run fails without modifying data
