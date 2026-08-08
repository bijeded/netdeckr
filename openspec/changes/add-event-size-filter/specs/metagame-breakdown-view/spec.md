## ADDED Requirements

### Requirement: Event size filter
The dashboard SHALL let the user restrict the metagame to events of a single size class, where an event's size is its reported tournament size (`player_count`). The control SHALL sit **inside the existing "Event" sidebar filter group** — after that group's "Event" heading and above its event select — and SHALL carry **no visible heading of its own**, so the group reads as one Event filter with two controls rather than two separate groups. Having no visible label, the control SHALL still expose a localized accessible name so it is distinguishable from the event select to assistive technology. It SHALL offer an "All event sizes" default entry plus five mutually exclusive entries:

| Entry | Matches events whose size is |
| --- | --- |
| Small | fewer than 32 players |
| Medium | 32 to 95 players |
| Large | 96 to 255 players |
| Massive | 256 players or more |
| Unsized | not reported by the source |

Selecting a size class from this control SHALL restrict the derived breakdown and per-archetype decks to the decks of events in that class, combined (AND) with the active format, time-frame, event, archetype, and tier filters. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the retained decks**, exactly as it is under any other corpus-narrowing filter. Events whose size is not reported SHALL be matched **only** by the "Unsized" entry — they SHALL NOT be treated as Small, and they SHALL NOT be silently excluded from the "All sizes" default. The default state SHALL be "All event sizes" (no size restriction).

Size classification SHALL NOT alter tier assignment: each archetype's tier remains its Last-2-Weeks Power Score against the whole 2-week field, unaffected by the selected size class, exactly as under the Event filter.

Every entry SHALL be offered whether or not the current (format, window) contains any event of that class; an entry matching no events SHALL remain selectable and SHALL lead to the localized empty state rather than being hidden. All labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a size class narrows the breakdown
- **WHEN** the user selects a size class from the Event size filter
- **THEN** the archetype grid, ranks, shares, StatCard totals, and freshness derive from only the decks of events in that class within the active format and time-frame

#### Scenario: Percentages reflect share within the retained decks
- **WHEN** a size class is selected
- **THEN** each archetype card's percentage equals its deck count among the retained decks divided by the total retained decks, summing to 100% across the shown field

#### Scenario: Band boundaries are exact
- **WHEN** events of 31, 32, 95, 96, 255, and 256 players are present in the corpus
- **THEN** the 31-player event matches Small, the 32- and 95-player events match Medium, the 96- and 255-player events match Large, and the 256-player event matches Massive

#### Scenario: Unsized events are their own class
- **WHEN** an event has no reported tournament size and the user selects "Unsized"
- **THEN** that event's decks are retained, and they are excluded from Small, Medium, Large, and Massive alike

#### Scenario: The size control sits inside the Event group without its own heading
- **WHEN** the sidebar renders
- **THEN** the size control appears between the "Event" group heading and the event select, with no heading of its own, and the sidebar shows no separate size filter group

#### Scenario: The unlabelled size control is still identifiable to assistive technology
- **WHEN** the size control is reached by a screen reader
- **THEN** it announces a localized accessible name distinguishing it from the event select in the same group

#### Scenario: Unsized events are not hidden by the default
- **WHEN** the Event size filter is set to "All event sizes"
- **THEN** the breakdown includes the decks of events with and without a reported size, with no size restriction

#### Scenario: A size class with no matching events shows an empty state
- **WHEN** the user selects a size class that no event in the current format and window falls into
- **THEN** the entry is still selectable and a localized empty state is shown in place of the grid

#### Scenario: Tiers are unaffected by the size filter
- **WHEN** a size class is selected
- **THEN** each shown archetype keeps the tier it carries under the unfiltered view, assigned from its Last-2-Weeks Power Score against the whole 2-week field

#### Scenario: Size labels are localized
- **WHEN** the locale is switched
- **THEN** the "All event sizes" default, the Small/Medium/Large/Massive/Unsized labels, and the control's accessible name switch language

## MODIFIED Requirements

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL contain the event-size control (see the Event size filter requirement) above its event select, under the single "Event" heading. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window) **and in the active event-size class**, each labelled with the event name, its abbreviated date, and — when the event's tournament size (`player_count`) is known — that size appended after the date as a localized parenthetical (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). When the size is unknown, the entry SHALL show only the name and abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, event-size, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. In the default popularity view (no archetype isolated and no tier selected), selecting an event SHALL display **all** of that event's archetypes uncapped (the broad-view top-12 display cap is not applied), and SHALL replace the "Top N most popular archetypes" caption — in the same position, above the freshness line — with the selected event's name, abbreviated date, and known size (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). The tournament size SHALL be shown identically (same localized parenthetical, omitted when unknown) in both the dropdown entry and the caption. The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next (including the count-aware "players"/"jugadores" size text), with MTG proper nouns (including the event name) kept in English in both locales.

#### Scenario: Selecting an event narrows the breakdown
- **WHEN** the user selects a single event from the Event filter
- **THEN** the archetype grid, ranks, shares, and freshness derive from only that event's decks within the active format and time-frame

#### Scenario: Percentages reflect share within the selected event
- **WHEN** an event is selected
- **THEN** each archetype card's percentage equals that archetype's deck count in the event divided by the event's total decks (summing to 100% across the event), not its share of the full window

#### Scenario: Event list reflects the current format and window
- **WHEN** the Event filter group renders for a given format and time-frame
- **THEN** it lists exactly the events whose decks fall within that (format, window), each shown by name and abbreviated date (with the tournament size appended when known), plus the "All events" default

#### Scenario: Event list is narrowed by an active size class
- **WHEN** an event-size class is selected and the Event filter group renders
- **THEN** it lists only the events of that size class within the current (format, window), plus the "All events" default, so no unreachable event can be selected

#### Scenario: Known tournament size is shown after the date
- **WHEN** a selected or listed event has a known tournament size (`player_count`)
- **THEN** its label (in both the dropdown entry and the caption) appends the size after the date as a localized parenthetical (e.g. "(128 players)" / "(128 jugadores)", singular "(1 player)" / "(1 jugador)")

#### Scenario: Unknown tournament size is omitted
- **WHEN** a selected or listed event has no known tournament size (`player_count` is null)
- **THEN** its label shows only the event name and abbreviated date, with no size parenthetical and no placeholder

#### Scenario: All events default shows the full breakdown
- **WHEN** the Event filter is set to "All events"
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction, and the caption returns to "Top N most popular archetypes"

#### Scenario: Event-filtered popularity view is uncapped and named after the event
- **WHEN** an event is selected and neither an archetype nor a tier filter is active
- **THEN** every archetype present in that event is shown (the top-12 display cap is not applied) and the caption above the freshness line reads the event's name followed by its abbreviated date

#### Scenario: Expanding a card under an event filter shows all its decks
- **WHEN** an event is selected and the user expands an archetype card
- **THEN** every one of that archetype's decks in the event is shown (the broad-view display cap is not applied), ordered best finish first

### Requirement: Filters combine over the deck corpus
The dashboard SHALL apply the event-size, event, archetype, tier, and time-frame filters together as a logical AND over the active format's deck corpus, re-deriving the metagame breakdown from the resulting deck subset. Applying the filters SHALL NOT require any additional data fetch beyond the corpus already loaded for the active format.

#### Scenario: Event and archetype filters stack with the time frame
- **WHEN** an event, an archetype, and a non-default time-frame are all selected
- **THEN** the shown breakdown and decks reflect the intersection of all three within the active format

#### Scenario: Tier and event filters stack
- **WHEN** a tier and an event are both selected
- **THEN** the grid shows that tier's archetypes present in the event, with shares recomputed within the event

#### Scenario: Size stacks with the other filters
- **WHEN** an event-size class is selected together with an archetype, a tier, and/or a non-default time-frame
- **THEN** the shown breakdown and decks reflect the intersection of all of them within the active format

#### Scenario: Size filtering needs no additional fetch
- **WHEN** the user changes the event-size selection
- **THEN** the breakdown is re-derived from the corpus already loaded for the active format, with no further request to the database

### Requirement: Auto-reset of invalid filter selections
When a selected event or archetype is no longer present after a change to the format, time-frame, event size, or another filter, the dashboard SHALL silently reset that filter group to its "All" default rather than showing a stale selection or an error. (The Tier and Event size filters' options are always selectable regardless of data, so neither is auto-reset for absence — a tier or size class that matches nothing shows an empty state instead; see their respective requirements. The Tier filter is only reset by the archetype-precedence rule and by "Clear filters".)

#### Scenario: Selected event disappears after switching format
- **WHEN** an event is selected and the user switches to a format or window in which that event does not exist
- **THEN** the Event filter silently resets to "All events" and the unrestricted breakdown for the new (format, window) is shown

#### Scenario: Selected archetype disappears after a filter change
- **WHEN** an archetype is selected and a format, window, or event change removes that archetype from the view
- **THEN** the Archetype filter silently resets to "All archetypes"

#### Scenario: Selected event falls outside a newly selected size class
- **WHEN** an event is selected and the user then selects a size class that event does not belong to
- **THEN** the Event filter silently resets to "All events" and the size class is applied, so the most recent choice is the one honored

#### Scenario: A selected size class is never auto-reset for absence
- **WHEN** the selected size class matches no event after a format or time-frame change
- **THEN** the Event size filter keeps that selection and the view shows the localized empty state rather than reverting to "All event sizes"

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event-size, event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Enabled, it SHALL read as an available action and SHALL be clearly distinguishable from its disabled state, which SHALL recede rather than compete with the caption beside it. Both controls SHALL have identical effect. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the event-size, event, archetype, and tier filters all reset to their "All" defaults and the default top-12 caption view returns

#### Scenario: Main-window reset resets all groups
- **WHEN** the user activates the main-window "Reset" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the filters reset exactly as the sidebar's "Clear filters" control does, and the caption returns to the default popularity view

#### Scenario: Reset is disabled when nothing is filtered
- **WHEN** no event-size, event, archetype, or tier filter is active
- **THEN** the main-window "Reset" control is still rendered in place but is disabled and cannot be activated

#### Scenario: A size selection alone enables Reset
- **WHEN** the only active filter is an event-size class
- **THEN** both the sidebar "Clear filters" and the main-window "Reset" controls are enabled

#### Scenario: The enabled Reset stands out from the disabled one
- **WHEN** a filter is applied and the "Reset" control becomes enabled
- **THEN** it is visibly emphasized as an available action, distinct from the muted treatment it carries while disabled

#### Scenario: Reset is reachable on mobile
- **WHEN** the viewport is narrow and the sidebar is collapsed
- **THEN** the main-window "Reset" control is visible on the caption row without opening the sidebar

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event-size, event, archetype, and/or tier filter active
- **THEN** the filters return to their "All" defaults and the URL carries no filter param
