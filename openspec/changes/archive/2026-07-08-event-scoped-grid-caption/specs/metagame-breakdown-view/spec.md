## MODIFIED Requirements

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window), each labelled with the event name and its abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. In the default popularity view (no archetype isolated and no tier selected), selecting an event SHALL display **all** of that event's archetypes uncapped (the broad-view top-12 display cap is not applied), and SHALL replace the "Top N most popular archetypes" caption — in the same position, above the freshness line — with the selected event's name and abbreviated date (e.g. "Standard Challenge — 24 Jun 2026"). The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next, with MTG proper nouns (including the event name) kept in English in both locales.

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
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction, and the caption returns to "Top N most popular archetypes"

#### Scenario: Event-filtered popularity view is uncapped and named after the event
- **WHEN** an event is selected and neither an archetype nor a tier filter is active
- **THEN** every archetype present in that event is shown (the top-12 display cap is not applied) and the caption above the freshness line reads the event's name followed by its abbreviated date

#### Scenario: Expanding a card under an event filter shows all its decks
- **WHEN** an event is selected and the user expands an archetype card
- **THEN** every one of that archetype's decks in the event is shown (the broad-view display cap is not applied), ordered best finish first

### Requirement: Tier filter
The dashboard SHALL provide a sidebar filter group, headed "Tiers" (localized), placed after the Archetype filter, that lets the user restrict the grid to archetypes of a single performance tier. The group SHALL offer an "All tiers" default entry plus one entry per tier: Tier 1, Tier 2, Tier 3, and Rogue/Otros (localized labels), mapping to the existing T1/T2/T3/Otros tiers. Selecting a tier SHALL show **all** archetypes of that tier (uncapped) as normal collapsible cards — each click-to-expand for its decks, not auto-expanded — and SHALL replace the "Top N most popular archetypes" popularity caption (in the same position, above the freshness line) with a localized caption naming the selected tier and the count of archetypes shown (e.g. "Tier 1 — 13 archetypes"; the fringe tier uses the "Rogue"/"Otros" label). When an event filter is also active, the tier caption SHALL combine the tier label with the selected event's name and abbreviated date (e.g. "Tier 1 — Standard Challenge — 24 Jun 2026"). The tier grouping SHALL use the same whole-2-week-corpus tier assignment as the tier badges. The default state SHALL be "All tiers"; the heading, default entry, and tier labels SHALL be localized. The StatCard header strip SHALL narrow to the selected tier (its archetype count, their decks, and the distinct events among them).

#### Scenario: Selecting a tier groups the grid by that tier
- **WHEN** the user selects a single tier from the Tiers filter
- **THEN** the grid shows every archetype assigned to that tier as a collapsible card, with no top-12 cap, and the caption names the tier and count (e.g. "Tier 1 — 13 archetypes")

#### Scenario: Tier caption folds in an active event filter
- **WHEN** a tier is selected and an event filter is also active
- **THEN** the caption combines the tier label with the event's name and abbreviated date (e.g. "Tier 1 — Standard Challenge — 24 Jun 2026")
