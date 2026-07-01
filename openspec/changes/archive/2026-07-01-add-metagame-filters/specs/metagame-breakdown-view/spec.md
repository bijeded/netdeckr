## ADDED Requirements

### Requirement: Time-frame filter
The dashboard SHALL provide a sidebar selector, headed "Time Frame" (localized), that lets the user choose the metagame time window from exactly three options — Last 5 Days, Last 2 Weeks, Last 2 Months — the three windows MTGTop8 offers with the same meaning for every format. These are stored and referenced by format-independent logical keys (`5days`, `2weeks`, `2months`). Selecting a window SHALL update the displayed breakdown to that format + window's stored snapshot. The selected window SHALL be preserved when the active format is switched. All selector labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a different window updates the breakdown
- **WHEN** the user selects a window different from the current one for a format that has data for it
- **THEN** the archetype grid, ranks, shares, and freshness indicator update to that format + window's stored snapshot

#### Scenario: Window is preserved across format switches
- **WHEN** the user has a non-default window selected and switches the active format
- **THEN** the same window remains selected and the new format's breakdown for that window is shown

#### Scenario: Selector labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the three window options and the "Time Frame" heading render their labels in that language

### Requirement: Default window selection
The dashboard SHALL default to the Last 5 Days (`5days`) window when no window is specified.

#### Scenario: First visit defaults to Last 5 Days
- **WHEN** the dashboard is opened with no window specified in the URL
- **THEN** the Last 5 Days window is selected and its breakdown is shown

### Requirement: Persist the selected window across reloads
The dashboard SHALL persist the selected window in the URL alongside the format (e.g. `?f=ST&w=2weeks`) so that reloading or sharing the link restores the same window. An absent, invalid, or unknown window param SHALL fall back to the default Last 5 Days window without error.

#### Scenario: Reload preserves the window
- **WHEN** the user has selected a non-default window and reloads the page
- **THEN** the same window remains selected and its breakdown is shown

#### Scenario: URL window is applied on load
- **WHEN** the dashboard is opened with a valid window param in the URL
- **THEN** that window is selected and the matching breakdown is shown

#### Scenario: Invalid window param falls back to default
- **WHEN** the dashboard is opened with an absent, invalid, or unknown window param
- **THEN** the Last 5 Days window is selected without error

## MODIFIED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL read the selected format and window's stored metagame breakdown from Supabase and display up to the top 20 archetypes, sorted by metagame share descending. Each archetype SHALL be shown as a card containing its rank (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, a placeholder gradient art header, and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`).

#### Scenario: Breakdown renders for a format and window with data
- **WHEN** the dashboard loads a format + window that has a stored breakdown
- **THEN** its archetypes are shown as cards sorted by share descending, each with rank, English name, mana pips, placeholder art, and its share percentage as one-decimal monospace text

#### Scenario: More than 20 archetypes are hard-cut
- **WHEN** a format + window's stored breakdown contains more than 20 archetypes
- **THEN** only the top 20 by share are displayed and the remainder are omitted, with no aggregated "Other" row

### Requirement: Data freshness indicator
The dashboard SHALL display an "Updated X ago" indicator reflecting the selected format and window's last-updated timestamp.

#### Scenario: Freshness reflects last update
- **WHEN** a format + window's breakdown is displayed and it has a last-updated timestamp
- **THEN** an "Updated X ago" indicator shows the elapsed time since that timestamp

### Requirement: Loading, empty, and error states
While the breakdown query is in flight the dashboard SHALL show a spinner in the main window. When the selected format and window have no stored data, or the read fails, the dashboard SHALL show a centered friendly message with a frowny face in the main window instead of cards.

#### Scenario: Loading spinner while fetching
- **WHEN** the breakdown query for the selected format + window is in progress and has not yet returned
- **THEN** a spinner is displayed in the main window

#### Scenario: Empty state when no data
- **WHEN** the selected format + window has no stored breakdown
- **THEN** a centered friendly message with a frowny face is shown in the main window instead of cards

#### Scenario: Error state on read failure
- **WHEN** the Supabase read for the selected format + window fails
- **THEN** the same centered friendly frowny-face state is shown rather than a broken screen
