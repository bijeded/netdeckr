## ADDED Requirements

### Requirement: StatCard filter modals
Each of the three header StatCards SHALL act as a control that opens a modal listing the options for one filter: **Events** opens the event filter, **Archetypes** opens the archetype filter, and **Decks** opens the tier filter. Each modal SHALL present the breakdown of the metric shown on its card — one row per event, per archetype, or per tier — with each row carrying the count or share that accounts for its part of that total. Selecting a row SHALL apply that filter and close the modal. Modal titles, row labels, and the "All …" entries SHALL be localized in Spanish and English; event and archetype names are proper nouns and stay in English in both locales. The modals SHALL offer no search or free-text filtering; rows SHALL keep the ordering already used elsewhere in the dashboard — archetypes by metagame share descending, events by date descending, tiers in T1, T2, T3, Rogue order.

#### Scenario: Events card opens the event filter
- **WHEN** the user activates the Events StatCard
- **THEN** a modal opens listing every event in the current format and window, each row showing the event name, its abbreviated date, and its deck count

#### Scenario: Archetypes card opens the archetype filter
- **WHEN** the user activates the Archetypes StatCard
- **THEN** a modal opens listing every archetype in the current corpus in share-descending order, each row showing its color-identity pips, name, metagame share, and tier

#### Scenario: Decks card opens the tier filter
- **WHEN** the user activates the Decks StatCard
- **THEN** a modal opens listing the four tiers, each row showing the tier badge, its localized label, and the number of decks in that tier

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
- **THEN** all three StatCards are interactive and their modals behave identically

### Requirement: StatCard shows its active filter
A StatCard whose filter is active SHALL display the selected value beneath its metric label, so the filtered state is visible without opening the sidebar. A StatCard whose filter is at its "All" default SHALL render exactly as before, with no extra line.

#### Scenario: Active filter is named on the card
- **WHEN** an event, archetype, or tier filter is active
- **THEN** the corresponding StatCard shows the selected event, archetype, or tier beneath its label

#### Scenario: Unfiltered cards are unchanged
- **WHEN** no filter is active
- **THEN** the three StatCards render their value and label only, with no additional line

#### Scenario: The card reflects filters set from the sidebar
- **WHEN** the user sets a filter from the sidebar rather than from a modal
- **THEN** the corresponding StatCard shows that value just the same

### Requirement: Filter controls share one state
The sidebar filter selects and the StatCard filter modals SHALL be two entry points to the same event, archetype, and tier selections, never independent copies. A selection made through either entry point SHALL be immediately reflected in the other, and existing filter interactions — the archetype filter taking precedence over the tier filter, and auto-reset of selections that become invalid — SHALL apply identically no matter which entry point made the selection.

#### Scenario: A modal selection updates the sidebar
- **WHEN** the user selects an event, archetype, or tier from a StatCard modal
- **THEN** the matching sidebar select shows that value when the sidebar is next visible

#### Scenario: A sidebar selection updates the modals
- **WHEN** the user sets a filter from the sidebar and then opens the corresponding StatCard modal
- **THEN** that modal marks the sidebar's selection as the active row

#### Scenario: Archetype precedence applies to modal selections
- **WHEN** the user selects an archetype from the Archetypes modal while a tier filter is active and that archetype is outside the selected tier
- **THEN** the tier filter resets to its default exactly as it does for a sidebar selection

## MODIFIED Requirements

### Requirement: Archetype filter takes precedence over the tier filter
When both an archetype and a tier are selected, the single-archetype isolation SHALL win: the grid SHALL isolate and auto-expand the chosen archetype's card. If the chosen archetype falls outside the selected tier, the Tier filter SHALL silently reset to "All tiers" (mirroring the invalid-selection auto-reset), so the view is never internally contradictory. The resolution SHALL favor the most recent choice: selecting a tier while a contradictory archetype is isolated SHALL clear the archetype filter and apply the tier, just as selecting an archetype clears a contradictory tier. Neither filter SHALL silently discard the selection the user just made.

#### Scenario: Choosing an archetype outside the selected tier resets the tier
- **WHEN** a tier is active and the user selects an archetype that is not in that tier
- **THEN** the grid isolates and auto-expands that archetype's card and the Tier filter silently resets to "All tiers"

#### Scenario: Archetype within the selected tier stays isolated
- **WHEN** a tier is active and the user selects an archetype that is in that tier
- **THEN** the grid isolates and auto-expands that archetype's card

#### Scenario: Choosing a tier outside the isolated archetype clears the archetype
- **WHEN** an archetype is isolated and the user selects a tier that archetype does not belong to
- **THEN** the tier filter is applied, the archetype filter resets to "All archetypes", and the grid shows that tier's archetypes

#### Scenario: Choosing the isolated archetype's own tier keeps it isolated
- **WHEN** an archetype is isolated and the user selects the tier that archetype belongs to
- **THEN** both filters stay applied and the grid keeps isolating that archetype

### Requirement: Header StatCard strip
The dashboard SHALL display a StatCard strip in the header, right-aligned on the same row as the format title, showing three metrics for the currently displayed metagame: the number of **Events**, the number of **Archetypes**, and the number of **Decks**. The metrics SHALL reflect the currently displayed corpus: with no event or archetype filter active they SHALL report the whole (format, window); when an event or archetype filter is active they SHALL narrow to the filtered subset. The **Archetypes** metric SHALL be the count of distinct archetypes in that corpus (not the capped number of archetype cards shown in the grid). Because the archetype filter is display-only (it does not narrow the derived breakdown), when an archetype is selected the strip SHALL reflect that isolated archetype: Archetypes = 1, Decks = that archetype's decks under the active filters, and Events = the distinct events among those decks. Numbers SHALL render in the monospace font with thousands separators (e.g. `1,284`); the metric labels SHALL be localized in Spanish and English via react-i18next. Each of the three cards SHALL additionally be an interactive control that opens its filter modal and SHALL be reachable by keyboard with a visible focus indicator. The strip's placement SHALL NOT change the existing title, time-frame pill, or freshness indicator.

#### Scenario: Strip reports the whole window when unfiltered
- **WHEN** a format and time-frame are selected with no event or archetype filter
- **THEN** the strip shows the total events, distinct archetypes, and total decks in that (format, window)

#### Scenario: Archetype count is the distinct total, not the shown rows
- **WHEN** the window contains more distinct archetypes than the grid's display cap
- **THEN** the Archetypes metric shows the true distinct total, not the number of cards rendered

#### Scenario: Event filter narrows the strip
- **WHEN** an event is selected
- **THEN** the strip's events, archetypes, and decks reflect only that event's decks

#### Scenario: Archetype filter narrows the strip to the isolated archetype
- **WHEN** an archetype is selected
- **THEN** the strip shows Archetypes = 1, Decks = that archetype's deck count, and Events = the number of distinct events those decks came from

#### Scenario: Strip is right-aligned and leaves the rest of the header unchanged
- **WHEN** the header renders
- **THEN** the StatCard strip appears right-aligned on the title row while the format title, time-frame pill, and freshness indicator keep their existing positions

#### Scenario: Labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the three metric labels render in that language while the numbers render in the monospace font with thousands separators

#### Scenario: Cards are reachable by keyboard
- **WHEN** the user tabs through the header
- **THEN** each of the three StatCards receives focus with a visible indicator and can be activated to open its filter modal

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Both controls SHALL have identical effect. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event, archetype, and/or tier filter active
- **THEN** the event, archetype, and tier filters all reset to their "All" defaults and the default top-12 caption view returns

#### Scenario: Main-window reset resets all groups
- **WHEN** the user activates the main-window "Reset" control with an event, archetype, and/or tier filter active
- **THEN** the filters reset exactly as the sidebar's "Clear filters" control does, including the StatCards dropping their active-filter lines

#### Scenario: Reset is disabled when nothing is filtered
- **WHEN** no event, archetype, or tier filter is active
- **THEN** the main-window "Reset" control is still rendered in place but is disabled and cannot be activated

#### Scenario: Reset is reachable on mobile
- **WHEN** the viewport is narrow and the sidebar is collapsed
- **THEN** the main-window "Reset" control is visible on the caption row without opening the sidebar

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event, archetype, and/or tier filter active
- **THEN** the filters return to their "All" defaults and the URL carries no filter param
