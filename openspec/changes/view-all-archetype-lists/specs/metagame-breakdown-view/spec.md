# Spec Delta

## ADDED Requirements

### Requirement: Isolated archetype persisted in the URL
The isolated archetype SHALL be persisted in the URL as `?a=<archetype name>` alongside `?f=` and `?w=`, and removed when no archetype is isolated, so a link restores the view. A valid `?a=` on load SHALL open that isolated view once data loads; one naming no archetype in the loaded view SHALL reset silently and be removed. "View all lists →" SHALL add a history entry, so Back returns to the grid; other archetype changes SHALL replace the current entry.

#### Scenario: Isolating an archetype writes it to the URL
- **WHEN** the user isolates an archetype through the Archetype filter or the "View all lists →" control
- **THEN** the URL carries `?a=` with that archetype's name, and the existing `?f=` and `?w=` params are preserved

#### Scenario: Leaving the isolated view removes the param
- **WHEN** an archetype is isolated and the user selects "All archetypes", activates "Clear filters" or "Reset", or switches format
- **THEN** the `?a=` param is removed from the URL

#### Scenario: A shared link opens the isolated view
- **WHEN** the dashboard is opened with `?f=` and `?a=` naming an archetype present in that format's selected window
- **THEN** once the data loads, the grid shows that archetype isolated and auto-expanded, the Archetype filter shows it, and the caption names it

#### Scenario: Archetype names with special characters round-trip
- **WHEN** an archetype whose name contains spaces, slashes, or other URL-reserved characters (e.g. "4/5C Control") is isolated and the resulting URL is reloaded
- **THEN** the same archetype is isolated after reload

#### Scenario: Unknown archetype in the URL resets silently
- **WHEN** the dashboard is opened with an `?a=` value that names no archetype in the loaded format and window
- **THEN** the default grid is shown with no error, the Archetype filter shows "All archetypes", and `?a=` is removed from the URL

#### Scenario: The param survives the initial load
- **WHEN** the dashboard is opened with a valid `?a=` and the metagame data has not yet finished loading
- **THEN** the archetype selection is not reset while loading, and is applied when the data arrives

#### Scenario: Back returns from the isolated view to the grid
- **WHEN** the user enters an isolated view through "View all lists →" and then presses the browser Back button
- **THEN** the dashboard returns to the non-isolated grid and `?a=` is gone from the URL

#### Scenario: Forward re-opens the isolated view
- **WHEN** the user has gone Back from an isolated view entered through "View all lists →" and presses Forward
- **THEN** the isolated view for that archetype is shown again

#### Scenario: Sidebar selection does not add history entries
- **WHEN** the user changes the archetype through the sidebar Archetype filter
- **THEN** the URL's `?a=` updates without adding a browser history entry

#### Scenario: Archetype removed by a window change drops the param
- **WHEN** an archetype is isolated and the user switches to a time window in which it has no decks
- **THEN** the Archetype filter resets to "All archetypes" and `?a=` is removed from the URL

### Requirement: Leave the isolated archetype view
While an archetype is isolated, the caption row SHALL show a localized "← Back" control beside "Reset", in Reset's enabled treatment, and only then. It SHALL clear the isolated archetype and its `?a=` param, keeping any other active filter. When the view was entered through "View all lists →", it SHALL step back through browser history; otherwise it SHALL clear in place without adding a history entry.

#### Scenario: Back appears only in the isolated view
- **WHEN** an archetype is isolated
- **THEN** the caption row shows a "← Back" control (localized) beside "Reset"; when no archetype is isolated, no "← Back" control is shown

#### Scenario: Back returns to the grid, keeping other filters
- **WHEN** an archetype is isolated with an event filter also active and the user activates "← Back"
- **THEN** the grid returns with the event filter still applied, the Archetype filter shows "All archetypes", and `?a=` is removed from the URL

#### Scenario: Back after "View all lists →" undoes that navigation
- **WHEN** the user entered the isolated view through "View all lists →" and activates "← Back"
- **THEN** the dashboard returns to the grid by stepping back through browser history, so the browser's own Back button does not land on a duplicate grid entry

#### Scenario: Back from a shared link clears in place
- **WHEN** the isolated view was opened from a shared `?a=` link or the sidebar Archetype filter and the user activates "← Back"
- **THEN** `?a=` is removed without adding a browser history entry

## MODIFIED Requirements

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event-size, event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Enabled, it SHALL read as an available action and SHALL be clearly distinguishable from its disabled state, which SHALL recede rather than compete with the caption beside it. Both controls SHALL have identical effect. The event-size, event, and tier selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL. The archetype selection is the one exception: it SHALL be persisted in the URL as specified by "Isolated archetype persisted in the URL", and clearing it SHALL remove that param. The enabled treatment SHALL be visually distinct from the dashboard's data indicators: it SHALL NOT reuse the share-delta trend colors, so that the control is never mistaken for a metric by the archetype cards below it. The disabled treatment SHALL remain neutral — carrying no accent hue at all — rather than being a faded variant of the enabled one.

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
- **WHEN** the user reloads the page with an event-size, event, and/or tier filter active
- **THEN** those filters return to their "All" defaults and the URL carries no event-size, event, or tier param

#### Scenario: The isolated archetype persists across reloads
- **WHEN** the user reloads the page with an archetype isolated
- **THEN** the same archetype is isolated after reload, while any event-size, event, or tier filter that was active returns to its "All" default

#### Scenario: Clearing removes the archetype param
- **WHEN** an archetype is isolated and the user activates "Clear filters" or "Reset"
- **THEN** the `?a=` param is removed from the URL along with the in-memory filters being reset

#### Scenario: The enabled Reset does not read as a metric
- **WHEN** a filter is applied and the "Reset" control is enabled while the grid below shows archetype cards carrying rising/falling share-delta indicators
- **THEN** the control's accent is not the share-delta trend colors, and it remains distinguishable from those indicators

#### Scenario: The enabled Reset separates from the caption beside it
- **WHEN** a filter is applied and the "Reset" control is enabled on the grid caption row
- **THEN** its accent differs from the caption text's own accent, so the two do not read as one block

#### Scenario: The disabled Reset carries no accent hue
- **WHEN** no filter is active and the "Reset" control is disabled
- **THEN** it is rendered in the neutral muted treatment with no accent hue, not as a faded version of the enabled control's accent
