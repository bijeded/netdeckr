## Purpose

Keeps decks that are no longer tournament-legal out of every derived metagame figure, so that the day after a Wizards of the Coast ban the dashboard reports the field a player may actually register rather than the pre-ban field MTGTop8 keeps reporting for weeks.

## ADDED Requirements

### Requirement: Per-format banlist derived from Scryfall legalities

The system SHALL maintain, per supported format, the set of card names that are banned in that format, derived from the card legality information published in Scryfall's bulk card data. It SHALL NOT require any additional upstream source, and in particular SHALL NOT scrape a Wizards of the Coast or community banlist page.

Only the `banned` legality status matters. A card that is restricted, or that is simply not legal in a format because it was never printed into it, SHALL NOT be treated as banned — a `not_legal` card cannot appear in a legal decklist for that format in the first place, and treating it as a ban would wrongly discard decks over a data-resolution artifact.

The banlist SHALL be refreshed on every pipeline run, so that removing a card from a banlist (an unban) takes effect the same way a ban does.

#### Scenario: Banned card recorded for its format

- **WHEN** the card data reports a card's legality in a supported format as `banned`
- **THEN** that card name is recorded as banned in that format

#### Scenario: Restricted and not-legal statuses are ignored

- **WHEN** a card's legality in a format is `restricted`, `not_legal`, or `legal`
- **THEN** the card is not recorded as banned in that format

#### Scenario: All five formats are covered

- **WHEN** the banlist is refreshed
- **THEN** it covers Standard, Pioneer, Modern, Pauper, and Pre-Modern, each from that format's own legality status

#### Scenario: Unbanned card is removed

- **WHEN** a card previously recorded as banned in a format is no longer reported as banned there
- **THEN** the next refresh removes it, and decks containing it stop being treated as illegal

### Requirement: First-seen date marks a newly detected ban

Each banned-card record SHALL carry a first-seen date recording when the pipeline first observed that card as banned in that format, and that date SHALL NOT change on subsequent runs while the card stays banned. This date is the system's only proxy for a ban announcement, since the upstream card data carries no announcement date.

The first population of the banlist SHALL record no first-seen date for any card, marking every pre-existing ban as historical. Only bans that appear in a later run — that is, a genuine change against a banlist the system already knew — SHALL receive a first-seen date.

#### Scenario: Newly banned card is dated

- **WHEN** a refresh finds a card banned in a format that was not recorded as banned there on the previous refresh
- **THEN** that record's first-seen date is set to the date of that refresh

#### Scenario: Existing ban keeps its original date

- **WHEN** a refresh finds a card that is already recorded as banned in that format
- **THEN** its first-seen date is left unchanged

#### Scenario: Initial population announces nothing

- **WHEN** the banlist is populated for the first time, with no previously stored banlist to compare against
- **THEN** every record is written with no first-seen date, and no ban is treated as newly detected

#### Scenario: Re-ban after an unban is dated again

- **WHEN** a card is removed from a format's banlist and later appears on it again
- **THEN** its reappearance is treated as a newly detected ban and receives the current date

### Requirement: A deck holding a banned card is illegal

A deck SHALL be considered illegal when at least one of its cards, in either the mainboard or the sideboard, is banned in the format of the event the deck was played in. Matching SHALL use each deck card's resolved canonical card name; a card whose name never resolved SHALL NOT be matched, so an unresolved name can only ever leave a deck counted, never wrongly discard one.

#### Scenario: Mainboard copy makes the deck illegal

- **WHEN** a deck's mainboard contains a card banned in that deck's format
- **THEN** the deck is illegal

#### Scenario: Sideboard copy makes the deck illegal

- **WHEN** a deck's sideboard contains a card banned in that deck's format, and its mainboard does not
- **THEN** the deck is illegal

#### Scenario: A ban in another format does not apply

- **WHEN** a deck contains a card that is banned in a different format but legal in its own
- **THEN** the deck is legal

#### Scenario: Unresolved card names never discard a deck

- **WHEN** a deck contains a card whose name did not resolve to a canonical card
- **THEN** that card cannot make the deck illegal

### Requirement: Illegal decks contribute to no derived figure

Illegal decks SHALL be removed from the metagame corpus before any figure is derived from it. No illegal deck SHALL contribute to an archetype's deck count, metagame share, share denominator, Power Score, tier, tier-cutoff reference field, Tier-1 minimum-deck count, performance trend, period-over-period share delta, header totals, filter option lists, displayed decklists, or trending card counts.

The exclusion SHALL be applied uniformly, without reference to which archetype a deck belongs to: an archetype whose every deck is illegal disappears from the breakdown, and an archetype that also has legal decks keeps exactly those and is scored on them alone.

#### Scenario: An entirely illegal archetype disappears

- **WHEN** every deck of an archetype in the window contains a banned card
- **THEN** the archetype does not appear in the breakdown, in the archetype filter options, or in the trending computation

#### Scenario: A surviving archetype keeps only its legal finishes

- **WHEN** an archetype has both legal and illegal decks in the window
- **THEN** it remains in the breakdown, and its share, Power Score, tier, trend, and share delta are derived only from its legal decks

#### Scenario: Tier cutoffs ignore illegal decks

- **WHEN** tiers are assigned after a ban
- **THEN** the reference field whose natural breaks set the cutoffs contains no score derived from an illegal deck

#### Scenario: Shares are computed against the legal field

- **WHEN** archetype shares are computed after a ban
- **THEN** the denominator is the count of legal decks in the window, so the displayed shares sum over the legal field only

#### Scenario: Trending counts exclude the whole illegal deck

- **WHEN** the trending tables are computed after a ban
- **THEN** an illegal deck contributes none of its cards — not the banned card, and not the legal cards alongside it

#### Scenario: A format with no bans is unaffected

- **WHEN** a format's banlist matches nothing in its corpus
- **THEN** every derived figure is identical to what it would be without this capability
