## ADDED Requirements

### Requirement: Time-window toggle on the title row
The dashboard SHALL render, on the format-title row, an interactive pill that both names the active time window and switches it. The pill's visible label SHALL name the **currently selected** window (Last 7 Days or Last 2 Weeks, localized). Activating the pill SHALL select the other of the two windows, updating the breakdown exactly as the sidebar time-frame selector does, and SHALL leave the active format, the URL format param, and every other active filter untouched.

The pill and the sidebar time-frame selector SHALL always show the same selection: changing the window through either control SHALL update both, and the selection SHALL be persisted in the `?w=` URL param by either path. The sidebar selector SHALL remain available; the pill is an additional entry point, not a replacement.

#### Scenario: Activating the pill widens the window
- **WHEN** the Last 7 Days window is selected and the user activates the pill
- **THEN** the Last 2 Weeks window becomes selected, the breakdown is re-derived for that window, and the pill's label changes to name Last 2 Weeks

#### Scenario: Activating the pill narrows the window
- **WHEN** the Last 2 Weeks window is selected and the user activates the pill
- **THEN** the Last 7 Days window becomes selected, the breakdown is re-derived for that window, and the pill's label changes to name Last 7 Days

#### Scenario: Pill and sidebar selector stay in sync
- **WHEN** the user changes the window through either the pill or the sidebar time-frame selector
- **THEN** the other control reflects the same window, and the `?w=` URL param is updated to it

#### Scenario: Selected format and filters survive the toggle
- **WHEN** a non-default format, and an event, event-size, archetype, or tier filter, are active and the user activates the pill
- **THEN** only the window changes; the format and any filter selection that is still valid for the new window remain as they were

### Requirement: Toggle pill names its direction
The pill SHALL carry a directional glyph naming the move its activation performs: a trailing `→` while Last 7 Days is selected (activation widens the window), and a leading `←` while Last 2 Weeks is selected (activation narrows it back). The glyph SHALL sit on the side it points toward, so the label reads as a step out to the wider window and a step back to the narrower one.

#### Scenario: Glyph points outward on the narrow window
- **WHEN** the Last 7 Days window is selected
- **THEN** the pill reads as the Last 7 Days label followed by a trailing `→`

#### Scenario: Glyph points back on the wide window
- **WHEN** the Last 2 Weeks window is selected
- **THEN** the pill reads as a leading `←` followed by the Last 2 Weeks label

### Requirement: Toggle pill is operable and localized
The pill SHALL be a real control: reachable and activatable by keyboard, exposing a visible focus indicator when focused, and showing a pointer cursor and a distinct hover state under a pointer. Its accessible name SHALL name the **action** — switching to the other window — rather than repeating the visible state label, and SHALL be localized in Spanish and English via react-i18next along with the visible label. Because the pill is a swap between two windows and not an on/off state, it SHALL NOT expose a pressed state.

#### Scenario: Keyboard operation
- **WHEN** the user moves focus to the pill and activates it from the keyboard
- **THEN** the window swaps exactly as it does on click, and the pill shows a visible focus indicator while focused

#### Scenario: Accessible name names the action
- **WHEN** assistive technology reads the pill while Last 7 Days is selected
- **THEN** the announced name says the control switches to Last 2 Weeks, while the visible label still reads Last 7 Days

#### Scenario: Pill copy is localized
- **WHEN** the active locale is Spanish or English
- **THEN** both the pill's visible window label and its accessible name render in that language
