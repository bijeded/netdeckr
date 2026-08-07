# metagame-data-pipeline

## Purpose
The Supabase schema (formats with a per-format last-updated timestamp, archetypes, events, decks, deck cards) and the MTGTop8 scraper that gathers decklists for all five formats — from which the frontend derives the metagame breakdown at read time. Run twice daily via GitHub Actions and readable read-only by the browser. Decklists are gathered from the two-week window (following all pages of the events list) and pruned after 30 days.

## Requirements

### Requirement: Metagame data schema
The system SHALL define a Supabase (PostgreSQL) schema that stores the set of supported formats (each with a per-format last-updated timestamp) and the archetypes appearing in each format (each with its name, WUBRG color identity, and nullable signature-card art). The schema SHALL NOT store a separate per-window metagame breakdown: an archetype's metagame share is **derived at read time from the stored decks** (grouped by archetype within a window's date range). There SHALL be no `metagame_snapshots` table, no per-(format, window) freshness table, and no `meta_window` column.

#### Scenario: Schema supports the five formats
- **WHEN** the schema is applied to the database
- **THEN** the five formats Standard (`ST`), Pioneer (`PI`), Modern (`MO`), Pauper (`PAU`), and Pre-Modern (`PREM`) each exist and can hold a per-format last-updated timestamp

#### Scenario: Archetype row carries name, color identity, and art
- **WHEN** an archetype exists for a format
- **THEN** its row records the archetype name, its WUBRG color identity (which may be empty for colorless), and its nullable signature-card art columns

#### Scenario: No stored breakdown or window key
- **WHEN** the schema is applied to the database
- **THEN** there is no metagame-snapshot table, no per-window freshness table, and no `meta_window` column — the metagame breakdown is computed from the decks at read time

### Requirement: Public read-only access
The system SHALL expose the metagame data — formats, archetypes, events, decks, and deck cards — for anonymous read-only access via Row Level Security, and SHALL NOT permit writes through the anonymous (browser) role. Writes SHALL only be possible with the service-role key used by the data pipeline.

#### Scenario: Anonymous role can read
- **WHEN** a browser client using the anon key queries a format's archetypes and decks
- **THEN** it receives the rows

#### Scenario: Anonymous role cannot write
- **WHEN** a client using the anon key attempts to insert, update, or delete metagame data
- **THEN** the write is rejected by RLS

### Requirement: Per-format data freshness
The scraper SHALL stamp each format's `formats.last_updated_at` with the run time after a successful scrape of that format, and the frontend SHALL read that per-format timestamp for its freshness indicator. There SHALL be no per-(format, window) freshness storage.

#### Scenario: Successful scrape stamps the format timestamp
- **WHEN** the scraper completes a successful run for a format
- **THEN** that format's `last_updated_at` is set to the run time

#### Scenario: Freshness is read per format
- **WHEN** the dashboard shows a format's metagame
- **THEN** the freshness indicator reflects that format's `last_updated_at`, not a per-window timestamp

### Requirement: Parsing is unit-tested against fixtures
The scraper's HTML parsing SHALL be covered by tests that run against saved MTGTop8 HTML fixtures and SHALL NOT depend on live network access. Fixtures SHALL cover the events list (including a paginated page-2 list), event result pages, and decklists, so the event / deck / pagination parsing is verified offline.

#### Scenario: Event and decklist parsing verified from fixtures
- **WHEN** the event-list, event-decks, or decklist parser is given a saved MTGTop8 fixture
- **THEN** it returns the expected events / decks / cards without making a network request

#### Scenario: Pagination verified from a saved page-2 fixture
- **WHEN** the events-list parser is given a saved page-2 MTGTop8 events fixture
- **THEN** it returns that page's events without a network request, and a page that yields no new events halts the pagination loop

### Requirement: Decklist data schema
The system SHALL extend the Supabase (PostgreSQL) schema to store tournament decklists linked to the existing archetypes: `events` (a MTGTop8 event with its name, date, format, source identifier, and — where MTGTop8 reports it — the tournament's player count), `decks` (an individual deck at an event, linked to its event and archetype, recording the player name and placing/result), and `deck_cards` (the cards of a deck, recording quantity, whether the card is in the mainboard or sideboard, the resolved Scryfall card identity where available, and the resolved printing's hotlinked image URL where available). The archetypes table SHALL additionally carry nullable representative-card columns (a signature card name and its hotlinked image URL). Events SHALL be uniquely identifiable so re-runs do not create duplicates. The events table SHALL carry a **nullable** integer player-count column (the tournament's size), left null when MTGTop8 does not report a size; the column is additive and requires no migration of existing rows.

#### Scenario: Schema stores events, decks, and deck cards
- **WHEN** the schema is applied to the database
- **THEN** an event can hold multiple decks, each deck belongs to one event and one archetype and records its player and placing, and each deck holds mainboard and sideboard cards with quantities

#### Scenario: Event stores tournament size when reported, null otherwise
- **WHEN** the schema is applied and an event is stored
- **THEN** it provides a nullable player-count column that holds the tournament's size when MTGTop8 reports it and is null when no size is reported

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

### Requirement: Archetype color identity from name, then cards
The scraper SHALL derive each archetype's stored WUBRG `color_identity` from its name as the primary signal and, only when the name yields no color identity, from the union of its decks' cards' Scryfall color identities. The card-derived fallback SHALL include a color only when that color appears in **both** at least a configured minimum share of the archetype's decks **and** at least a configured minimum absolute number of decks, so that neither an occasional splash nor a single off-color deck on a very small archetype adds a color pip. The minimum-deck-count floor SHALL be capped at the archetype's deck count, so an archetype with only one deck keeps that deck's colors (base and splash cannot be distinguished from a single deck) rather than losing all color. The derived value SHALL be recomputed and persisted on each run (not written only when the archetype is first inserted), so an archetype's color identity can be filled or corrected as its decks accumulate. When neither the name nor the cards yield any color (e.g. an all-colorless deck, or no resolvable cards), the color identity SHALL remain empty.

#### Scenario: Name yields a color identity
- **WHEN** an archetype's name carries a recognizable color signal (guild, shard, mono-color, or an explicit WUBRG letter code)
- **THEN** the stored color identity is the name-derived WUBRG value and the card-derived fallback is NOT applied

#### Scenario: Name has no color, cards supply it
- **WHEN** an archetype's name yields no color identity but its decks' cards resolve to Scryfall color identities
- **THEN** the stored color identity is the WUBRG-ordered union of the colors that appear in at least the minimum share AND at least the minimum number of the archetype's decks

#### Scenario: Splash color is excluded
- **GIVEN** an archetype whose name yields no color and whose decks contain a color appearing in fewer than the minimum share of its decks
- **WHEN** the color identity is derived from its cards
- **THEN** that splash color is omitted from the stored color identity

#### Scenario: Single-deck splash on a tiny archetype is excluded
- **GIVEN** an archetype whose name yields no color and that has two decks, where a color appears in only one of them (0.5 share, above the minimum share) but the base colors appear in both
- **WHEN** the color identity is derived from its cards
- **THEN** the one-deck splash color is omitted (it appears in fewer than the minimum-deck-count floor) while the base colors are kept

#### Scenario: One-deck archetype keeps its colors
- **GIVEN** an archetype whose name yields no color and that has exactly one deck resolving to colored cards
- **WHEN** the color identity is derived from its cards
- **THEN** that deck's colors are kept (the deck-count floor is capped at the archetype's deck count, so a lone deck is not blanked)

#### Scenario: No color signal from name or cards
- **WHEN** an archetype's name yields no color identity and its decks resolve only to colorless cards (or no cards resolve)
- **THEN** the stored color identity remains empty (rendered as a single gray pip by the dashboard)

#### Scenario: Recompute corrects an existing archetype in place
- **GIVEN** an archetype already stored with an empty color identity because its name carried no color
- **WHEN** the archetype-refresh pass runs and its decks' cards yield a card-derived color identity
- **THEN** the archetype's stored color identity is updated to the card-derived value without requiring the archetype to be re-inserted, and re-running the pass with unchanged decks leaves the value unchanged

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

### Requirement: One-time event-size backfill mode
The system SHALL provide a standalone `--backfill-sizes` maintenance mode that populates `events.player_count` on already-stored events whose size is null, by fetching each such event's page and parsing its reported player count. The mode SHALL update an event's `player_count` only when a size is found (a miss leaves the row null), SHALL NOT re-fetch or modify decks or deck cards, and SHALL be idempotent (safe to re-run). The pass SHALL be exposed as a workflow-dispatch option so it can be triggered once against the stored corpus, and the size-parsing it relies on SHALL be unit-tested against saved fixtures without making a network request.

#### Scenario: Backfill fills a null size from the event page
- **WHEN** the backfill runs and a stored event with a null player count has an event page that reports a size
- **THEN** that event's `player_count` is set to the reported size

#### Scenario: A page with no reported size is left null
- **WHEN** the backfill fetches a stored event whose page reports no size
- **THEN** that event's `player_count` remains null and the pass continues

#### Scenario: Backfill does not touch decks or cards
- **WHEN** the backfill runs
- **THEN** it updates only `events.player_count` and does not fetch decklists or modify decks or deck cards

#### Scenario: One event failure does not abort the pass
- **WHEN** fetching or parsing one event's page raises an error during the backfill
- **THEN** the remaining events are still processed

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
The scraper SHALL run **twice a day** via GitHub Actions (two runs roughly 12 hours apart), authenticating to Supabase with the service-role key provided via repository secrets. Within each of the two daily runs it SHALL run one job per format on staggered schedules (rather than a single job covering all formats at once) so that load on the source is spread out; each scheduled run SHALL scrape exactly one format. A manual trigger SHALL still be able to run a single format or all formats on demand.

A scheduled run SHALL report success only when the work it was scheduled to do actually completed. In particular, a run that could not enrich scraped cards with Scryfall data SHALL report failure, so that a successful run is a reliable signal that decklists were both scraped and enriched. Failures arising from an upstream data-source change SHALL be visible in the run's status, not only in its logs.

#### Scenario: Two staggered per-format bands each day
- **WHEN** the pipeline runs on its schedule
- **THEN** each of the five formats is scraped by its own job at its own staggered time, in each of the two daily bands (~12 hours apart), each authenticating with the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets

#### Scenario: Manual trigger scrapes a chosen format or all
- **WHEN** the workflow is triggered manually
- **THEN** it scrapes the requested single format, or all formats when none is specified

#### Scenario: Enrichment failure fails the run
- **WHEN** a scheduled run cannot obtain Scryfall card data
- **THEN** the workflow run is reported as failed rather than successful

### Requirement: Archetype identity is case-insensitive and canonical

An archetype SHALL be uniquely identified within a format by its name compared **case-insensitively**, so that the same archetype scraped from different MTGTop8 pages — which capitalize archetype names inconsistently (e.g. `UW Control` on one page vs. `Uw Control` on the event decklist results table) — resolves to a single archetype row. The get-or-create upsert used by the decklist scrape SHALL match case-insensitively, and the schema SHALL enforce uniqueness on `(format_code, lower(name))` so no case-variant duplicate row can be created. A single human-preferred display name SHALL be stored per archetype.

#### Scenario: Case-variant name resolves to the existing archetype

- **WHEN** the scraper encounters an archetype name that differs only by capitalization from one already stored for that format (e.g. `Uw Control` when `UW Control` exists)
- **THEN** it resolves to the existing archetype row and attaches the deck to it, without creating a second archetype row

#### Scenario: Schema rejects a case-variant duplicate

- **WHEN** an insert is attempted for a `(format_code, name)` whose lowercased name already exists for that format
- **THEN** the database uniqueness constraint prevents a duplicate archetype row

#### Scenario: Existing duplicate rows are merged

- **WHEN** the case-insensitivity migration runs against data containing case-variant duplicate archetype rows
- **THEN** each duplicate group is collapsed to one canonical row, its decks are re-pointed to that row, and the orphaned duplicate rows are removed

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
