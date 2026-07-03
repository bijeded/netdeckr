# metagame-data-pipeline

## Purpose
The Supabase schema (formats, archetypes, metagame snapshots, per-window freshness) and the MTGTop8 scraper that populates the archetype breakdown for all five formats across the two logical time windows (`5days`, `2weeks`), run daily via GitHub Actions and readable read-only by the browser. Decklists are gathered from the two-week window (following all pages of the events list) and pruned after 30 days.

## Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores, per supported format AND per time window, a metagame breakdown: the set of formats, the archetypes appearing in each format's breakdown for each window, and for each archetype its metagame share percentage, its rank within the format+window, and its color identity. The windows SHALL be stored as format-independent logical keys — `5days` and `2weeks` — the time windows the dashboard offers, with the same meaning, for every format. Metagame snapshots SHALL be keyed by `(format_code, meta_window, archetype_id)`. The schema SHALL also store, per format AND window, the timestamp of the most recent successful data update.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) can each hold their own metagame breakdown and last-updated timestamp

#### Scenario: Schema supports the logical windows per format
- **WHEN** the schema is applied to the database
- **THEN** each format can independently hold a breakdown and a last-updated timestamp for each logical window (`5days`, `2weeks`), keyed by `(format_code, meta_window, archetype_id)`

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
The system SHALL provide a scraper that, for each of the five formats and for each of the two logical windows (`5days`, `2weeks`), resolves the window to that format's MTGTop8 `meta` param ID (which is per-format), fetches the corresponding archetype breakdown from `http://mtgtop8.com/format?f=<code>&meta=<id>`, parses each archetype's name, share percentage, and color identity, and upserts them into the schema keyed by the logical window with a rank assigned by descending share. On a successful run for a format+window, the scraper SHALL set that format+window's last-updated timestamp.

#### Scenario: Successful scrape stores a format+window breakdown
- **WHEN** the scraper runs for a format+window and MTGTop8 returns a valid breakdown page
- **THEN** the format+window's archetypes with their share percentages and color identities are stored under the logical window key, ranked by descending share, and that format+window's last-updated timestamp is set to the run time

#### Scenario: Window is resolved to the per-format meta ID
- **WHEN** the scraper fetches a `(format, logical window)` pair
- **THEN** it uses that format's own MTGTop8 `meta` ID for the window (e.g. `2weeks` is `50` for Standard but `54` for Modern), so each format returns its own distinct data per window

#### Scenario: Both windows are fetched per format
- **WHEN** the scraper runs for a format
- **THEN** it fetches each of the two logical windows (`5days`, `2weeks`) and stores a separate breakdown per window, and does not fetch or store a `2months` breakdown

#### Scenario: Re-run replaces the prior breakdown
- **WHEN** the scraper runs again for a format+window that already has stored data
- **THEN** that format+window's breakdown reflects the latest fetched archetypes and shares, without accumulating stale archetypes from the previous run

#### Scenario: Source failure leaves prior data intact
- **WHEN** the scraper fails to fetch or parse a format+window's page
- **THEN** that format+window's previously stored breakdown and last-updated timestamp are left unchanged

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access. Fixtures SHALL cover more than one `meta` window and SHALL include a paginated (page-2) events list so the pagination logic is verified offline.

#### Scenario: Parsing verified from a saved fixture
- **WHEN** the parser is given a saved MTGTop8 breakdown fixture for a given `meta` window
- **THEN** it returns the expected archetypes with their share percentages and color identities, without making a network request

#### Scenario: Pagination verified from a saved page-2 fixture
- **WHEN** the events-list parser is given a saved page-2 MTGTop8 events fixture
- **THEN** it returns that page's events without a network request, and a page that yields no new events halts the pagination loop

### Requirement: Decklist data schema
The system SHALL extend the Supabase (PostgreSQL) schema to store tournament decklists linked to the existing archetypes: `events` (a MTGTop8 event with its name, date, format, and source identifier), `decks` (an individual deck at an event, linked to its event and archetype, recording the player name and placing/result), and `deck_cards` (the cards of a deck, recording quantity, whether the card is in the mainboard or sideboard, the resolved Scryfall card identity where available, and the resolved printing's hotlinked image URL where available). The archetypes table SHALL additionally carry nullable representative-card columns (a signature card name and its hotlinked image URL). Events SHALL be uniquely identifiable so re-runs do not create duplicates.

#### Scenario: Schema stores events, decks, and deck cards
- **WHEN** the schema is applied to the database
- **THEN** an event can hold multiple decks, each deck belongs to one event and one archetype and records its player and placing, and each deck holds mainboard and sideboard cards with quantities

#### Scenario: Deck card records the scraped name, optional Scryfall identity, and optional image
- **WHEN** a deck card is stored
- **THEN** its row records the scraped card name, and provides nullable columns for a Scryfall canonical name, current non-foil set + collector number, and the printing's image URL — populated when the card resolves, left null on a miss

### Requirement: Decklists are readable read-only
The system SHALL expose the events, decks, and deck-cards tables for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role.

#### Scenario: Anonymous role can read decklists
- **WHEN** a browser client using the anon key queries an archetype's decks and their cards
- **THEN** it receives the deck and card rows

#### Scenario: Anonymous role cannot write decklists
- **WHEN** a client using the anon key attempts to insert, update, or delete events, decks, or deck cards
- **THEN** the write is rejected by RLS

### Requirement: Scraper populates decklists
The system SHALL extend the scraper to fetch, for each supported format, every event MTGTop8 lists in the **two-week window** (which contains the last-five-days events as a date subset) by following **every page** of that window's events list (`&cp=2`, `&cp=3`, …) until a page yields no new events, and to fetch all of the individual decklists of those events, parse each deck's player, placing (all finishes, not only Top 4), archetype, and mainboard/sideboard cards, and upsert the results into the events, decks, and deck_cards tables. Deck cards SHALL be stored with their scraped card name and, when the name resolves against the synced Scryfall bulk data, enriched with the canonical Scryfall name and a current non-foil set + collector number (a resolution miss leaves those columns null). Storing the complete set of events and decks — not a top-finish subset — ensures the data needed for later event and archetype filters is available. Each deck's event date SHALL be stored so the frontend can order by recency and scope by time window. The upsert SHALL be idempotent so re-running for the same events does not create duplicate events or decks.

#### Scenario: Successful scrape stores all events and decks with placing and date
- **WHEN** the scraper runs and MTGTop8 returns valid event and decklist pages for a format's two-week window
- **THEN** every event (with its date), all of its decks (with player, placing, and archetype), and each deck's mainboard and sideboard cards are stored — including decks that finished worse than Top 4 — so both the latest-lists fallback and later filters have complete data

#### Scenario: All pages of the events list are fetched
- **WHEN** the scraper gathers a format's events for the two-week window and MTGTop8 paginates them across multiple pages
- **THEN** it follows each subsequent page (`&cp=2`, `&cp=3`, …) until a page yields no new events (or a safety page cap is reached), so events beyond the first page are also stored and deduped against events already gathered or already in the database

#### Scenario: Deck cards are enriched with Scryfall identity when resolvable
- **WHEN** the scraper writes a deck's cards and a card name resolves against the synced Scryfall bulk data
- **THEN** that card row stores the canonical Scryfall name, set code, and collector number alongside the scraped name, and unresolved cards keep null Scryfall columns

#### Scenario: Re-run does not duplicate events or decks
- **WHEN** the scraper runs again over events it has already stored
- **THEN** those events and decks are not duplicated

#### Scenario: Decklist parsing verified from fixtures
- **WHEN** the decklist parser is given a saved MTGTop8 event/decklist fixture
- **THEN** it returns the expected decks with their players, placings, and mainboard/sideboard cards, without making a network request

### Requirement: Archetype representative-card art
The system SHALL store, per archetype, a representative (signature) card and both its hotlinked Scryfall normal image (`art_image_url`) and its cropped-art image (`art_crop_url`) — all nullable columns on the archetypes table. The scraper SHALL choose the archetype's signature card by ranking its stored mainboard cards and store the chosen card's images.

The signature card SHALL be chosen among the archetype's mainboard cards after excluding every card whose `type_line` contains "Land" (i.e. all lands, basic and nonbasic, including a DFC card whose land face makes its type line contain "Land"). Cards with a null/unknown `type_line` SHALL NOT be excluded as lands. Among the remaining non-land cards, the ranking SHALL be, in strict priority order: total mainboard quantity descending, then rarity descending (mythic > rare > uncommon > common), then set release date descending (most recent first), then converted mana cost descending, then card name ascending as a final deterministic tiebreak. For any ranking criterion a null/unknown value SHALL sort last, so a card with resolved metadata outranks one without when they are otherwise tied. Archetypes with no non-land candidate, or whose chosen card does not resolve to a printing, SHALL leave the art columns null. The computation SHALL run at scrape time and be available to a one-time backfill for existing archetypes.

#### Scenario: Nonbasic land is excluded from signature selection
- **WHEN** an archetype's highest-quantity mainboard card is a nonbasic land (its type line contains "Land")
- **THEN** that land is not chosen and the highest-ranked non-land card becomes the signature card

#### Scenario: Ties broken by rarity, set recency, then mana cost
- **WHEN** two non-land cards are tied on total mainboard quantity
- **THEN** the one with the higher rarity wins; if still tied, the one from the more recent set; if still tied, the higher converted mana cost; if still tied, the alphabetically-first card name

#### Scenario: Unresolved metadata sorts last
- **WHEN** two non-land cards are tied on quantity and one has null rarity/set-date/cmc
- **THEN** the card with resolved metadata is chosen, and selection remains deterministic

#### Scenario: Archetype gets its signature card's art
- **WHEN** the scraper has stored an archetype's decks and its chosen signature card resolves to a printing
- **THEN** that archetype row records the signature card name, the printing's normal image URL, and the printing's cropped-art URL

#### Scenario: Archetype without a resolvable card stays null
- **WHEN** no non-land signature card can be chosen or resolved for an archetype
- **THEN** the archetype's art columns are left null and the frontend falls back to the placeholder

### Requirement: One-time metadata backfill
The system SHALL provide a one-time `--backfill` scraper mode, run with the service-role key, that re-resolves existing `deck_cards` rows to populate the card-metadata columns (`type_line`, `rarity`, `cmc`, `released_at`, and any missing identity/image columns) and then recomputes every archetype's signature card, `art_image_url`, and `art_crop_url` from the refreshed data. The backfill SHALL be idempotent.

#### Scenario: Backfill fills metadata and recomputes art
- **WHEN** `--backfill` runs over deck cards missing the metadata columns
- **THEN** rows whose names resolve gain their type line, rarity, cmc, and set release date, and each archetype's signature card and art are recomputed from the refreshed rows

#### Scenario: Backfill is idempotent
- **WHEN** `--backfill` runs again after a prior successful backfill
- **THEN** already-enriched rows are unchanged and recomputed art matches the prior result

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

### Requirement: Decklist retention
The system SHALL apply a 30-day retention policy to decklist data, pruning events (and their decks and deck cards) older than 30 days during the daily run.

#### Scenario: Old decklists are pruned
- **WHEN** the daily prune step runs and events older than 30 days exist
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
