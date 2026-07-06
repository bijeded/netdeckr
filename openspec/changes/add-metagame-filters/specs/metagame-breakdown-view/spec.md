## ADDED Requirements

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window), each labelled with the event name and its abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next, with MTG proper nouns kept in English in both locales.

#### Scenario: Selecting an event narrows the breakdown
- **WHEN** the user selects a single event from the Event filter
- **THEN** the archetype grid, ranks, shares, and freshness derive from only that event's decks within the active format and time-frame

#### Scenario: Percentages reflect share within the selected event
- **WHEN** an event is selected
- **THEN** each archetype card's percentage equals that archetype's deck count in the event divided by the event's total decks (summing to 100% across the event), not its share of the full window

#### Scenario: Event list reflects the current format and window
- **WHEN** the Event filter group renders for a given format and time-frame
- **THEN** it lists exactly the events whose decks fall within that (format, window), each shown by name and abbreviated date, plus the "All events" default

#### Scenario: All events default shows the full breakdown
- **WHEN** the Event filter is set to "All events"
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction

### Requirement: Archetype filter
The dashboard SHALL provide a sidebar filter group, headed "Archetype" (localized), that lets the user collapse the grid to a single archetype. The group SHALL offer an "All archetypes" default entry plus one entry per archetype present in the current filtered view. Selecting an archetype SHALL collapse the grid to show only that archetype's card, and SHALL auto-expand that card to list **all** of the archetype's decks under the combined active filters — not just the limited display set — each shown by event and date, in descending date order. The default state SHALL be "All archetypes". Archetype proper nouns SHALL stay in English in both locales; the heading and default entry SHALL be localized.

#### Scenario: Selecting an archetype isolates and auto-expands it
- **WHEN** the user selects a single archetype from the Archetype filter
- **THEN** the grid collapses to only that archetype's card, and that card is auto-expanded showing every deck of that archetype under the active format, time-frame, and event filter

#### Scenario: All matching decks are shown in descending date order
- **WHEN** a single archetype is selected and its card is auto-expanded
- **THEN** all of the archetype's decks under the combined filters are listed by event and date, ordered most-recent first, without the display-count cap applied to the unfiltered grid

#### Scenario: All archetypes default shows the full grid
- **WHEN** the Archetype filter is set to "All archetypes"
- **THEN** the grid shows every archetype in the active filtered view

#### Scenario: Archetype filter with no matching decks shows an empty state
- **WHEN** the selected archetype has no decks under the combined active filters
- **THEN** a localized empty state is shown in place of the grid

### Requirement: Filters combine over the deck corpus
The dashboard SHALL apply the event, archetype, and time-frame filters together as a logical AND over the active format's deck corpus, re-deriving the metagame breakdown from the resulting deck subset. Applying the filters SHALL NOT require any additional data fetch beyond the corpus already loaded for the active format.

#### Scenario: Event and archetype filters stack with the time frame
- **WHEN** an event, an archetype, and a non-default time-frame are all selected
- **THEN** the shown breakdown and decks reflect the intersection of all three within the active format

### Requirement: Auto-reset of invalid filter selections
When a selected event or archetype is no longer present after a change to the format, time-frame, or another filter, the dashboard SHALL silently reset that filter group to its "All" default rather than showing a stale selection or an error.

#### Scenario: Selected event disappears after switching format
- **WHEN** an event is selected and the user switches to a format or window in which that event does not exist
- **THEN** the Event filter silently resets to "All events" and the unrestricted breakdown for the new (format, window) is shown

#### Scenario: Selected archetype disappears after a filter change
- **WHEN** an archetype is selected and a format, window, or event change removes that archetype from the view
- **THEN** the Archetype filter silently resets to "All archetypes"

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL additionally provide a "Clear filters" control (localized) that resets the event and archetype filters to their "All" defaults at once. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event and/or archetype filter active
- **THEN** both the event and archetype filters reset to their "All" defaults

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event and/or archetype filter active
- **THEN** the event and archetype filters return to their "All" defaults and the URL carries no event or archetype param
