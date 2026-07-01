## ADDED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL read the selected format's stored metagame breakdown from Supabase and display up to the top 20 archetypes, sorted by metagame share descending. Each archetype SHALL be shown as a card containing its rank (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, a placeholder gradient art header, and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`).

#### Scenario: Breakdown renders for a format with data
- **WHEN** the dashboard loads a format that has a stored breakdown
- **THEN** its archetypes are shown as cards sorted by share descending, each with rank, English name, mana pips, placeholder art, and its share percentage as one-decimal monospace text

#### Scenario: More than 20 archetypes are hard-cut
- **WHEN** a format's stored breakdown contains more than 20 archetypes
- **THEN** only the top 20 by share are displayed and the remainder are omitted, with no aggregated "Other" row

### Requirement: Color-identity mana pips
Each archetype card SHALL display mana pips representing its WUBRG color identity: one pip per color (up to five). An archetype with no color identity (colorless) SHALL display exactly one gray pip.

#### Scenario: Multi-color archetype
- **WHEN** an archetype has a color identity of two or more colors
- **THEN** one mana pip per color is shown, in WUBRG order, up to five pips

#### Scenario: Colorless archetype
- **WHEN** an archetype has no color identity
- **THEN** a single gray pip is shown

### Requirement: Default format selection
The dashboard SHALL default to the Standard format when no format is specified, and SHALL support the five formats Standard, Pioneer, Modern, Pauper, and Pre-Modern.

#### Scenario: First visit defaults to Standard
- **WHEN** the dashboard is opened with no format specified in the URL
- **THEN** Standard is selected and its breakdown is shown

### Requirement: Switch the active format
The dashboard SHALL let the user switch between the five formats, updating the displayed breakdown to the newly selected format.

#### Scenario: Selecting a different format updates the breakdown
- **WHEN** the user selects a format different from the current one
- **THEN** the displayed breakdown updates to that format's top-20 archetypes

### Requirement: Persist the selected format across reloads
The dashboard SHALL persist the selected format in the URL (e.g. `?f=ST`) so that reloading the page restores the same format.

#### Scenario: Reload preserves the format
- **WHEN** the user has selected a non-default format and reloads the page
- **THEN** the same format remains selected and its breakdown is shown

#### Scenario: URL format is applied on load
- **WHEN** the dashboard is opened with a valid format code in the URL
- **THEN** that format is selected and its breakdown is shown

### Requirement: Data freshness indicator
The dashboard SHALL display an "Updated X ago" indicator reflecting the selected format's last-updated timestamp.

#### Scenario: Freshness reflects last update
- **WHEN** a format's breakdown is displayed and the format has a last-updated timestamp
- **THEN** an "Updated X ago" indicator shows the elapsed time since that timestamp

### Requirement: Loading, empty, and error states
While the breakdown query is in flight the dashboard SHALL show a spinner in the main window. When the selected format has no stored data, or the read fails, the dashboard SHALL show a centered friendly message with a frowny face in the main window instead of cards.

#### Scenario: Loading spinner while fetching
- **WHEN** the breakdown query is in progress and has not yet returned
- **THEN** a spinner is displayed in the main window

#### Scenario: Empty state when no data
- **WHEN** the selected format has no stored breakdown
- **THEN** a centered friendly message with a frowny face is shown in the main window instead of cards

#### Scenario: Error state on read failure
- **WHEN** the Supabase read fails
- **THEN** the same centered friendly frowny-face state is shown rather than a broken screen

### Requirement: Bilingual UI copy
All user-facing copy introduced by the breakdown view SHALL be localized in both Spanish and English via react-i18next, with no hardcoded strings; MTG proper nouns (archetype names) SHALL remain in English in both locales.

#### Scenario: Copy switches with locale
- **WHEN** the active locale is Spanish or English
- **THEN** labels and state messages render in that language while archetype names stay in English
