## MODIFIED Requirements

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event-size, event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Enabled, it SHALL read as an available action and SHALL be clearly distinguishable from its disabled state, which SHALL recede rather than compete with the caption beside it. Both controls SHALL have identical effect. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL. The enabled treatment SHALL be visually distinct from the dashboard's data indicators: it SHALL NOT reuse the share-delta trend colors, so that the control is never mistaken for a metric by the archetype cards below it. The disabled treatment SHALL remain neutral — carrying no accent hue at all — rather than being a faded variant of the enabled one.

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

#### Scenario: The enabled Reset does not read as a metric
- **WHEN** a filter is applied and the "Reset" control is enabled while the grid below shows archetype cards carrying rising/falling share-delta indicators
- **THEN** the control's accent is not the share-delta trend colors, and it remains distinguishable from those indicators

#### Scenario: The enabled Reset separates from the caption beside it
- **WHEN** a filter is applied and the "Reset" control is enabled on the grid caption row
- **THEN** its accent differs from the caption text's own accent, so the two do not read as one block

#### Scenario: The disabled Reset carries no accent hue
- **WHEN** no filter is active and the "Reset" control is disabled
- **THEN** it is rendered in the neutral muted treatment with no accent hue, not as a faded version of the enabled control's accent
