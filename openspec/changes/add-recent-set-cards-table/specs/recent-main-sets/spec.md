# Spec Delta

## Purpose

Identifies the two most recent main Magic sets and which cards are printed in them, so the dashboard can rank how those sets' cards are being played in the scraped decks.

## ADDED Requirements

### Requirement: The two most recent main sets are identified

On each run the pipeline SHALL identify the two most recent main sets from the Scryfall bulk data it already downloads. A main set is one whose set type is `expansion` or `core`, that is a paper (non-digital) set, and whose release date is on or before the run date. The two with the latest release dates SHALL be chosen, ties broken deterministically by set code.

#### Scenario: Two latest released main sets chosen
- **WHEN** the latest released expansion/core sets are Reality Fracture (`FRA`) and, before it, The Hobbit (`HOB`)
- **THEN** the recent main sets are `FRA` and `HOB`

#### Scenario: An unreleased set is not chosen
- **WHEN** the bulk data already contains a previewed expansion whose release date is after the run date
- **THEN** that set is not one of the recent main sets until a run on or after its release date

#### Scenario: Non-main products are not chosen
- **WHEN** a commander, masters, draft-innovation, box, or digital-only set was released more recently than the latest expansion
- **THEN** it is not one of the recent main sets

#### Scenario: A new release rolls the pair forward
- **WHEN** a new expansion is released after `FRA`
- **THEN** the next run's recent main sets are that expansion and `FRA`, and `HOB` is no longer one of them

### Requirement: Every card printed in the recent main sets is recorded

The pipeline SHALL record, by canonical card name, every card with at least one paper printing in either recent main set, regardless of treatment and including reprints. Each recorded card SHALL carry the code, name, and release date of one recent main set it is printed in — the newer one when it is printed in both.

#### Scenario: A reprint is recorded
- **WHEN** a card first printed years earlier is reprinted in `FRA`
- **THEN** it is recorded with set code `FRA`

#### Scenario: Membership does not depend on the displayed printing
- **WHEN** a card is printed in `HOB` but the printing chosen for its display and Arena export is from another set
- **THEN** it is still recorded with set code `HOB`

#### Scenario: A card in both sets carries the newer one
- **WHEN** a card is printed in both `FRA` and `HOB`
- **THEN** it is recorded once, with set code `FRA`

#### Scenario: A multi-face card is recorded by its canonical name
- **WHEN** a split or double-faced card is printed in a recent main set
- **THEN** it is recorded under the same canonical name stored on resolved deck cards, so the two match by plain equality

### Requirement: The recent-set record is rebuilt each run

Each run SHALL replace the stored recent-set records with those derived from that run's card data, so the stored records always describe the current two sets. The rebuild SHALL be idempotent, SHALL NOT require any network fetch beyond the existing card-data sync, and SHALL NOT clear the stored records when the run cannot obtain a usable card index.

#### Scenario: Repeat run changes nothing
- **WHEN** the pipeline runs twice over unchanged card data
- **THEN** the stored recent-set records are identical after both runs

#### Scenario: No extra fetch
- **WHEN** the recent-set records are rebuilt
- **THEN** they derive entirely from the already-downloaded bulk card data

#### Scenario: A failed card sync keeps the previous records
- **WHEN** a run fails because no usable card index could be built
- **THEN** the previously stored recent-set records are left in place

### Requirement: Recent-set records are read-only to the browser

The recent-set records SHALL be readable by the anonymous (browser) role under Row Level Security and SHALL NOT be writable through it; writes SHALL only be possible with the service-role key used by the pipeline.

#### Scenario: Anonymous role can read the records
- **WHEN** a browser client using the anon key queries the recent-set records
- **THEN** it receives the rows

#### Scenario: Anonymous role cannot write the records
- **WHEN** a client using the anon key attempts to insert, update, or delete a recent-set record
- **THEN** the write is rejected by RLS

### Requirement: Copy-count aggregation of recent-set cards

The database SHALL expose a read-only aggregation, callable by the anon role, returning per card: total copies across mainboard and sideboard combined, distinct decks running it, its recorded set code, and an image. It SHALL take the same format, date-range, archetype, event, and event-size parameters as the trending aggregation, and SHALL count only cards whose resolved canonical name is recorded.

#### Scenario: Boards are combined
- **WHEN** a recorded card has 3 mainboard copies in one deck and 2 sideboard copies in another
- **THEN** its total copies are 5 and its distinct-deck count is 2

#### Scenario: Only recorded cards are counted
- **WHEN** the queried decks contain cards printed in the recent main sets and cards that are not
- **THEN** only the recorded cards appear, each with its recorded set code

#### Scenario: Unresolved cards never match
- **WHEN** a deck card's name did not resolve to a canonical Scryfall name
- **THEN** it does not appear in the aggregation

#### Scenario: Filters narrow the slice
- **WHEN** the aggregation is called with archetype, event, or event-size parameters
- **THEN** it counts only the decks matching them, with an empty event-id list yielding no rows, as in the trending aggregation

### Requirement: Recent-set aggregation excludes basic lands only

The recent-set aggregation SHALL exclude basic lands — any card whose played face's type line marks it as a Basic Land, including snow basics and Wastes — and SHALL include nonbasic lands.

#### Scenario: Nonbasic land included
- **WHEN** a nonbasic land printed in `FRA` is played in the queried decks
- **THEN** it appears in the aggregation

#### Scenario: Basic lands excluded
- **WHEN** the queried decks play basic lands printed in a recent main set, including snow-covered basics
- **THEN** none of them appears in the aggregation

### Requirement: Recent-set aggregation counts only legal decks

The recent-set aggregation SHALL exclude every deck holding a card banned in the queried format, in either board, reading the stored banlist at query time — the same whole-deck exclusion as the trending aggregation.

#### Scenario: Illegal deck contributes nothing
- **WHEN** a deck in the queried range holds a card banned in the format
- **THEN** none of its recorded cards contributes copies or a deck count

#### Scenario: Banlist change takes effect immediately
- **WHEN** a card is added to or removed from the format's stored banlist
- **THEN** the next aggregation reflects it with no recomputation of stored data
