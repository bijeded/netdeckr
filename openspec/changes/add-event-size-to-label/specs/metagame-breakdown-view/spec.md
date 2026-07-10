## MODIFIED Requirements

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window), each labelled with the event name, its abbreviated date, and — when the event's tournament size (`player_count`) is known — that size appended after the date as a localized parenthetical (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). When the size is unknown, the entry SHALL show only the name and abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. In the default popularity view (no archetype isolated and no tier selected), selecting an event SHALL display **all** of that event's archetypes uncapped (the broad-view top-12 display cap is not applied), and SHALL replace the "Top N most popular archetypes" caption — in the same position, above the freshness line — with the selected event's name, abbreviated date, and known size (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). The tournament size SHALL be shown identically (same localized parenthetical, omitted when unknown) in both the dropdown entry and the caption. The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next (including the count-aware "players"/"jugadores" size text), with MTG proper nouns (including the event name) kept in English in both locales.

#### Scenario: Selecting an event narrows the breakdown
- **WHEN** the user selects a single event from the Event filter
- **THEN** the archetype grid, ranks, shares, and freshness derive from only that event's decks within the active format and time-frame

#### Scenario: Percentages reflect share within the selected event
- **WHEN** an event is selected
- **THEN** each archetype card's percentage equals that archetype's deck count in the event divided by the event's total decks (summing to 100% across the event), not its share of the full window

#### Scenario: Event list reflects the current format and window
- **WHEN** the Event filter group renders for a given format and time-frame
- **THEN** it lists exactly the events whose decks fall within that (format, window), each shown by name and abbreviated date (with the tournament size appended when known), plus the "All events" default

#### Scenario: All events default shows the full breakdown
- **WHEN** the Event filter is set to "All events"
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction, and the caption returns to "Top N most popular archetypes"

#### Scenario: Event-filtered popularity view is uncapped and named after the event
- **WHEN** an event is selected and neither an archetype nor a tier filter is active
- **THEN** every archetype present in that event is shown (the top-12 display cap is not applied) and the caption above the freshness line reads the event's name followed by its abbreviated date

#### Scenario: Known tournament size is shown after the date
- **WHEN** a selected or listed event has a known tournament size (`player_count`)
- **THEN** its label (in both the dropdown entry and the caption) appends the size after the date as a localized parenthetical (e.g. "(128 players)" / "(128 jugadores)", singular "(1 player)" / "(1 jugador)")

#### Scenario: Unknown tournament size is omitted
- **WHEN** a selected or listed event has no known tournament size (`player_count` is null)
- **THEN** its label shows only the event name and abbreviated date, with no size parenthetical and no placeholder
