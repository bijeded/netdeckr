## ADDED Requirements

### Requirement: Header StatCard strip
The dashboard SHALL display a StatCard strip in the header, right-aligned on the same row as the format title, showing three metrics for the currently displayed metagame: the number of **Events**, the number of **Archetypes**, and the number of **Decks**. The metrics SHALL reflect the currently displayed corpus: with no event or archetype filter active they SHALL report the whole (format, window); when an event or archetype filter is active they SHALL narrow to the filtered subset. The **Archetypes** metric SHALL be the count of distinct archetypes in that corpus (not the capped number of archetype cards shown in the grid). Because the archetype filter is display-only (it does not narrow the derived breakdown), when an archetype is selected the strip SHALL reflect that isolated archetype: Archetypes = 1, Decks = that archetype's decks under the active filters, and Events = the distinct events among those decks. Numbers SHALL render in the monospace font with thousands separators (e.g. `1,284`); the metric labels SHALL be localized in Spanish and English via react-i18next. The strip's placement SHALL NOT change the existing title, time-frame pill, or freshness indicator.

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
