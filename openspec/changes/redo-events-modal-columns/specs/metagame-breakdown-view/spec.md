## MODIFIED Requirements

### Requirement: StatCard filter modals
Each of the three header StatCards SHALL act as a control that opens a modal listing the options for one filter: **Events** opens the event filter, **Archetypes** opens the archetype filter, and **Decks** opens the tier filter. Each modal SHALL present the breakdown of the metric shown on its card — one row per event, per archetype, or per tier.

The **Archetypes** and **Decks** modals' rows SHALL each carry exactly one figure accounting for that row's part of the card's total — the archetype's metagame share, and the tier's archetype count respectively. No modal row SHALL carry a second figure column.

The **Events** modal SHALL instead describe each event across three columns — its **date**, its **name**, and its **player count** — with no per-event deck count. Its breakdown of the Events card is the list itself, one row per event, so no row carries a figure accounting for a share of that total. Each of the three columns SHALL be reserved across the whole list so that the dates form one vertical band, the names another, and the player counts a third, rather than each fact trailing the end of its own row's preceding text. A fact the data does not record — an event with no date, or an event with no reported player count — SHALL be named in that column by a localized word meaning "unknown", rather than omitted or replaced by a punctuation mark, so that a missing value is visibly distinct from a value that was not asked for and is announced as its meaning to assistive technology.

Selecting a row SHALL apply that filter and close the modal. Modal titles, row labels, count-aware figures, and the "All …" entries SHALL be localized in Spanish and English; event and archetype names are proper nouns and stay in English in both locales. The modals SHALL offer no search or free-text filtering; rows SHALL keep the ordering already used elsewhere in the dashboard — archetypes by metagame share descending, events by date descending, tiers in T1, T2, T3, Rogue order.

#### Scenario: Events card opens the event filter
- **WHEN** the user activates the Events StatCard
- **THEN** a modal opens listing every event in the current format and window, each row showing the event's abbreviated date, then its name, then its player count, in that order

#### Scenario: Event facts form their own columns
- **WHEN** the events modal lists rows whose names and dates are of differing lengths
- **THEN** the dates are aligned in a column of their own, the names in another, and the player counts in a third, each row's three cells lining up with the corresponding cells of every other row

#### Scenario: An unrecorded event fact is named, not punctuated
- **WHEN** the events modal lists an event with no reported player count, or an event with no recorded date
- **THEN** that row shows a localized word meaning "unknown" in the corresponding column, keeping its place in the column band, and the row remains selectable and applies the event filter like any other

#### Scenario: The unrecorded-fact word is localized
- **WHEN** the events modal is opened in Spanish and in English with an event whose date or player count is unrecorded
- **THEN** the word reads in the active locale in each case, and the date column is wide enough for the longer of the two without the row wrapping

#### Scenario: The events modal carries no deck count
- **WHEN** the user opens the Events modal
- **THEN** no row shows a count of the decks belonging to that event, and no empty column is left where such a figure previously sat

#### Scenario: The "All events" row spans the full width
- **WHEN** the events modal opens
- **THEN** its leading "All events" row spans the full width of the row rather than taking the date, name, and player-count columns, and does not name those inapplicable facts as unknown

#### Scenario: Archetypes card opens the archetype filter
- **WHEN** the user activates the Archetypes StatCard
- **THEN** a modal opens listing every archetype in the current corpus in share-descending order, each row showing its color-identity pips, name, tier badge, and metagame share

#### Scenario: Tier badges form their own column
- **WHEN** the archetype modal lists rows whose names are of differing lengths
- **THEN** the tier badges are aligned in a column of their own between the names and the share figures, rather than each trailing the end of its own row's name

#### Scenario: Decks card opens the tier filter
- **WHEN** the user activates the Decks StatCard
- **THEN** a modal opens listing the four tiers, each row showing the tier badge, its localized label, and the number of archetypes in that tier

#### Scenario: Tier rows show archetype count and deck count in separate columns
- **WHEN** the tier modal lists its rows
- **THEN** each row carries the archetype count alone and no deck-count column is rendered — this scenario's name is retained from the two-figure behavior it replaces, which the implementation had already dropped

#### Scenario: The tier modal's figures account for the whole field
- **WHEN** the tier modal is opened with no event or archetype filter active
- **THEN** the "All tiers" row shows the total number of archetypes in the current format and window, and the four tier rows' archetype counts sum to that total

#### Scenario: Tier figures are count-aware in both locales
- **WHEN** a tier contains exactly one archetype
- **THEN** that row's figure reads in the singular in the active locale (English "1 archetype", Spanish "1 arquetipo"), and rows with other counts read in the plural

#### Scenario: The other modals keep a single figure column
- **WHEN** the user opens the Archetypes modal or the Decks modal
- **THEN** each row carries exactly one figure — the archetype's metagame share, or the tier's archetype count — with no second figure column rendered anywhere

#### Scenario: One modal's columns do not leak into another
- **WHEN** the user opens the Archetypes modal or the Decks modal
- **THEN** neither reserves a leading date column nor renders any row full-width, and both keep the layout they had before the events modal gained those columns

#### Scenario: Selecting a row applies the filter
- **WHEN** the user selects a row in one of the modals
- **THEN** that filter is applied, the modal closes, and the grid, captions, trending tables, and StatCard strip all reflect the new filter

#### Scenario: The "All" row clears just that filter
- **WHEN** the user selects the first row of a modal ("All events", "All archetypes", or "All tiers")
- **THEN** only that filter returns to its default and any other active filters remain applied

#### Scenario: The active row is marked
- **WHEN** a modal opens while its filter is active
- **THEN** the row matching the current selection is visibly marked as selected

#### Scenario: A modal lists its full dimension regardless of its own filter
- **WHEN** a filter is active and the user opens that filter's own modal
- **THEN** every option for that dimension is still listed — computed over the corpus narrowed by the *other* active filters — so the user can switch to a different option or clear it

#### Scenario: Long lists scroll within the modal
- **WHEN** a modal's list is taller than the viewport allows
- **THEN** the list scrolls inside the modal while the page behind it does not

#### Scenario: Modal is dismissible without choosing
- **WHEN** the user presses Escape, activates the close control, or clicks the overlay outside the modal
- **THEN** the modal closes with no change to the active filters

#### Scenario: Modal is keyboard and screen-reader accessible
- **WHEN** a modal opens
- **THEN** it is announced as a modal dialog with a localized accessible name, focus moves into it, and on close focus returns to the StatCard that opened it

#### Scenario: Available on every viewport
- **WHEN** the dashboard renders on a narrow or a wide viewport
- **THEN** all three StatCards are interactive and their modals behave identically, the tier modal's figure remains legible beside its tier label without the row wrapping onto a second line, and the events modal's date and player-count columns remain legible beside the event name without the row wrapping onto a second line
