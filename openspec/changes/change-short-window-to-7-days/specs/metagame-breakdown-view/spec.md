## MODIFIED Requirements

### Requirement: Time-frame filter
The dashboard SHALL provide a sidebar selector, headed "Time Frame" (localized), that lets the user choose the metagame time window from exactly two options — Last 7 Days, Last 2 Weeks. These are format-independent logical keys (`7days`, `2weeks`) that select a **date range** over the format's decks (Last 2 Weeks contains Last 7 Days). Selecting a window SHALL update the displayed breakdown to the metagame derived from that format's decks whose event date falls within the window. The selected window SHALL be preserved when the active format is switched. All selector labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a different window updates the breakdown
- **WHEN** the user selects a window different from the current one for a format that has decks in it
- **THEN** the archetype grid, ranks, shares, and freshness indicator update to the breakdown derived from that format's decks within the window's date range

#### Scenario: Window is preserved across format switches
- **WHEN** the user has a non-default window selected and switches the active format
- **THEN** the same window remains selected and the new format's derived breakdown for that window is shown

#### Scenario: Only the two supported windows are offered
- **WHEN** the time-frame selector renders
- **THEN** exactly two options are shown — Last 7 Days and Last 2 Weeks — and no Last 2 Months option is present

#### Scenario: Selector labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the two window options and the "Time Frame" heading render their labels in that language

### Requirement: Default window selection
The dashboard SHALL default to the Last 7 Days (`7days`) window when no window is specified.

#### Scenario: First visit defaults to Last 7 Days
- **WHEN** the dashboard is opened with no window specified in the URL
- **THEN** the Last 7 Days window is selected and its breakdown is shown

### Requirement: Persist the selected window across reloads
The dashboard SHALL persist the selected window in the URL alongside the format (e.g. `?f=ST&w=2weeks`) so that reloading or sharing the link restores the same window. An absent, invalid, or unknown window param — including the retired `5days` and `2months` values — SHALL fall back to the default Last 7 Days window without error.

#### Scenario: Reload preserves the window
- **WHEN** the user has selected a non-default window and reloads the page
- **THEN** the same window remains selected and its breakdown is shown

#### Scenario: URL window is applied on load
- **WHEN** the dashboard is opened with a valid window param in the URL
- **THEN** that window is selected and the matching breakdown is shown

#### Scenario: Invalid or retired window param falls back to default
- **WHEN** the dashboard is opened with an absent, invalid, unknown, or retired (`5days` or `2months`) window param
- **THEN** the Last 7 Days window is selected without error
