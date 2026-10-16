# Spec Delta

## Purpose

An analysis of a single archetype over the format's last two weeks of tournament results: an exportable averaged stock list, how the archetype performs, and what its decks are built from.

## ADDED Requirements

### Requirement: Analysis covers the full 2-week corpus
The Analysis tab SHALL analyse the isolated archetype over the active format's Last 2 Weeks deck corpus across all events and event sizes. It SHALL NOT be affected by the sidebar time-frame, event-size, event, or tier filters. Decks excluded from the dashboard for containing a banned card SHALL be excluded from the analysis as well.

#### Scenario: Sidebar filters do not change the analysis
- **WHEN** the Analysis tab is open and the user changes the time frame to Last 7 Days or selects a single event, event size, or tier
- **THEN** every figure on the Analysis tab is unchanged

#### Scenario: Analysis spans 2 weeks while the sidebar shows 7 days
- **WHEN** the time frame is Last 7 Days and the archetype has decks from 10 days ago
- **THEN** those decks are included in the analysis

#### Scenario: Banned decks stay excluded
- **WHEN** a deck of the archetype contains a card banned in the format
- **THEN** that deck contributes to no figure, card, or count on the Analysis tab

### Requirement: Analysis states its fixed scope
The Analysis tab SHALL display a localized label stating that it covers the last 2 weeks and all events, and the number of decks and events it is built from. While any sidebar filter other than the archetype is active, the tab SHALL also display a localized note that those filters apply to the Lists tab only.

#### Scenario: Scope label is always shown
- **WHEN** the Analysis tab renders
- **THEN** it shows a "Last 2 weeks · all events" label (localized) with the analysed deck and event counts

#### Scenario: Filter note appears only while a filter is active
- **WHEN** the Analysis tab renders with an event, event-size, or tier filter active, or with the time frame on Last 7 Days
- **THEN** a note states that the sidebar filters apply to the Lists tab only
- **AND** the note is absent when no such filter is active and the time frame is Last 2 Weeks

### Requirement: Stock list ranks cards by finish-weighted inclusion
The stock list SHALL be built from the archetype's analysed decks, ranking each card by weighted inclusion: the summed weight of the decks playing it divided by the summed weight of all analysed decks. A deck's weight SHALL grow with how deep it finished and with its tournament's size, consistently with how the Power Score weights finishes. Cards SHALL be identified by canonical name, so each basic land type is its own card.

#### Scenario: A deep finish at a large event outweighs shallow finishes at small events
- **WHEN** card A is played only by a 1st-place deck at a 256-player event and card B only by one Top 32 deck at a 20-player event
- **THEN** card A ranks above card B

#### Scenario: Basic land types are separate cards
- **WHEN** the archetype's decks play both Island and Swamp
- **THEN** Island and Swamp are ranked and placed in the stock list independently

### Requirement: Stock list uses each card's most common copy count
Each card placed in the stock list SHALL be placed at the copy count most often played among the analysed decks that run it, never a fractional or averaged count. A tie between copy counts SHALL resolve to the higher count.

#### Scenario: Most common count beats the average
- **WHEN** four decks run a card at 4, 4, 1, and 1 copies
- **THEN** the stock list places it at 4 copies, not the rounded average of 3

#### Scenario: Most common count among three decks
- **WHEN** three decks run a card at 2, 2, and 3 copies
- **THEN** the stock list places it at 2 copies

### Requirement: Stock list mainboard keeps the archetype's land count
The stock list mainboard size SHALL be the median mainboard size of the analysed decks, and its land count the median land count. Lands SHALL fill the land slots and other cards the remaining slots, each in descending weighted inclusion. When a card's count exceeds the remaining slots in its group, only as many copies as fit SHALL be placed.

#### Scenario: Land count follows the decks
- **WHEN** the analysed decks have a median mainboard of 60 cards with a median of 24 lands
- **THEN** the stock list mainboard has exactly 60 cards, 24 of them lands

#### Scenario: Last card is trimmed to fit
- **WHEN** all but 2 non-land slots are filled and the next-ranked non-land card is most often played as a 4-of
- **THEN** it is placed at 2 copies and the mainboard is complete

#### Scenario: Lands classified by played face
- **WHEN** a card's played face is a sorcery and its other face is a land
- **THEN** it competes for a non-land slot, consistent with the decklist type grouping

### Requirement: Stock list sideboard follows the same ranking
The stock list sideboard SHALL be filled from sideboard cards in descending weighted inclusion at their most common copy count, up to the median sideboard size of the analysed decks, trimming the last card to fit. A card SHALL be allowed to appear in both the mainboard and the sideboard.

#### Scenario: Sideboard reaches its median size
- **WHEN** the analysed decks have a median sideboard of 15 cards
- **THEN** the stock list sideboard has 15 cards

#### Scenario: Archetype without sideboards
- **WHEN** the median sideboard size of the analysed decks is 0
- **THEN** the stock list has no sideboard

### Requirement: Stock list is displayed and exportable as a decklist
The stock list SHALL be the first section of the Analysis tab, presented like a decklist: grouped mainboard and flat sideboard in list view, with the same list/image view control. It SHALL offer the same clipboard export as the decklist modal — MTG Arena text for Standard and Pioneer, MTGO text otherwise — naming the archetype in Arena's deck-name block.

#### Scenario: Stock list renders as a decklist
- **WHEN** the Analysis tab loads for an archetype with decks
- **THEN** the stock list is shown first, with mainboard grouped by card type and section totals, and a sideboard list

#### Scenario: Export a Standard stock list
- **WHEN** the user triggers the export action on a Standard archetype's stock list
- **THEN** the stock list is copied as MTG Arena text with the archetype name in the `About` block, and the localized confirmation is shown

#### Scenario: Export a Modern stock list
- **WHEN** the user triggers the export action on a Modern archetype's stock list
- **THEN** the stock list is copied as MTGO text

### Requirement: Performance section
The Analysis tab SHALL show the archetype's 2-week share with its change versus the preceding 2 weeks, its tier and Power Score, its deck, event, and win counts, its top-8 conversion rate, a placement funnel, a per-event-size breakdown, and its share per day. Share change, tier, and wins SHALL agree with what the archetype card shows on the Last 2 Weeks time frame with no other filter.

#### Scenario: Figures match the unfiltered 2-week card
- **WHEN** the user compares the Analysis tab with the archetype's card on Last 2 Weeks with no other filter
- **THEN** the share, share change, tier, and win count are identical

#### Scenario: Placement funnel and top-8 rate
- **WHEN** the archetype's ranked-event decks finished 1st, 2nd, Top 4, Top 8, and deeper
- **THEN** the funnel shows the count in each of those buckets, and the top-8 rate is the share of those decks finishing Top 8 or better

#### Scenario: Unranked events do not mint finishes
- **WHEN** some of the archetype's decks come from an event whose standings are presentation order (e.g. an MTGO League)
- **THEN** those decks are counted separately from the placement funnel and top-8 rate rather than as 1st, 2nd, or Top 4 finishes

#### Scenario: Per-event-size breakdown
- **WHEN** the archetype has decks from small, medium, large, massive, and unsized events
- **THEN** each size class shows its deck count and average finish, using the same size classes as the Event size filter

#### Scenario: Share per day
- **WHEN** the 2-week corpus has events on some days and none on others
- **THEN** the share-per-day chart plots the archetype's share of that day's decks on each day with events and shows no value on days without events

### Requirement: Consensus card table
The Analysis tab SHALL list every mainboard card seen in the analysed decks with its inclusion (share of decks playing it) and average copies among decks that play it, banded as core (≥ 90% inclusion), flex (≥ 25%), or spicy (below 25%), and ordered by the stock list ranking. Each card in the stock list SHALL be marked as such.

#### Scenario: Cards are banded by inclusion
- **WHEN** a card is played by 30 of 32 decks, another by 12 of 32, and another by 2 of 32
- **THEN** they appear as core, flex, and spicy respectively, each with its inclusion and average copies

#### Scenario: Stock list membership is marked
- **WHEN** the consensus table renders
- **THEN** every card placed in the stock list mainboard carries a marker and no other card does

### Requirement: Sideboard plan
The Analysis tab SHALL list every sideboard card seen in the analysed decks with its inclusion and average copies among decks that play it, ordered by the stock list ranking, marking those placed in the stock list sideboard.

#### Scenario: Sideboard cards with inclusion
- **WHEN** the analysed decks run sideboard cards
- **THEN** each appears with its inclusion and average copies, and those in the stock list sideboard are marked

### Requirement: Mana curve and card-type split
The Analysis tab SHALL show the stock list mainboard's mana curve (non-land card counts by mana value, with the highest bucket open-ended) and its split into lands, creatures, spells, and other, using the decklist type classification.

#### Scenario: Curve excludes lands
- **WHEN** the stock list mainboard has 24 lands and 36 non-land cards
- **THEN** the curve sums to 36 and the type split shows 24 lands

#### Scenario: High mana values share a bucket
- **WHEN** the stock list includes cards with mana values 6, 7, and 9
- **THEN** they are counted in one open-ended top bucket

### Requirement: Arena wildcard cost
For Standard and Pioneer only, the Analysis tab SHALL show the number of mythic, rare, uncommon, and common wildcards needed to build the stock list (mainboard and sideboard), excluding basic lands. Other formats SHALL NOT show it.

#### Scenario: Wildcard cost for a Standard stock list
- **WHEN** the stock list for a Standard archetype contains 8 mythic, 24 rare, 6 uncommon, and 2 common non-basic cards plus basic lands
- **THEN** the wildcard cost shows 8 mythic, 24 rare, 6 uncommon, and 2 common

#### Scenario: No wildcard cost outside Arena formats
- **WHEN** the Analysis tab is open for a Modern, Pauper, or Pre-Modern archetype
- **THEN** no wildcard cost is shown

### Requirement: Small-sample label
When the archetype has fewer than 5 analysed decks, the stock list, consensus table, sideboard plan, and curve SHALL still render, each carrying a localized label that the sample is small.

#### Scenario: Four decks show the label
- **WHEN** the archetype has 4 decks in the 2-week corpus
- **THEN** the stock list and composition sections render with a small-sample label

#### Scenario: Five decks show no label
- **WHEN** the archetype has 5 decks in the 2-week corpus
- **THEN** no small-sample label is shown

### Requirement: Analysis loading and failure states
While the analysis card data loads, the Analysis tab SHALL show a loading indicator in place of the sections that depend on it. If that data fails to load, those sections SHALL show a localized error message and the rest of the tab, the Lists tab, and the dashboard SHALL remain usable.

#### Scenario: Card data fails to load
- **WHEN** the card data request for the analysis fails
- **THEN** the stock list and composition sections show a localized error, and the performance section and Lists tab still work

### Requirement: Localized analysis UI
All user-facing text on the Analysis tab — section headings, labels, bands, notes, chart axes and tooltips, export action, and confirmations — SHALL be provided through react-i18next in Spanish and English, with card and archetype names left in English in both locales.

#### Scenario: Analysis in both locales
- **WHEN** the user views the Analysis tab in Spanish or English
- **THEN** every interface label appears in the active locale while card and archetype names remain in English
