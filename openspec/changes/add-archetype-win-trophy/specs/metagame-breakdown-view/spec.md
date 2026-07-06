## ADDED Requirements

### Requirement: Archetype win trophy
The archetype card SHALL display a 🏆 trophy indicator when the archetype has at least one first-place deck in the currently displayed (filtered) view. The win count SHALL be the number of that archetype's decks whose finish is first place, counted from the same window- and event-filtered deck set that determines the archetype's share (so the trophy tracks the active format, time-frame, and event filters). When the archetype has exactly one first-place deck, the card SHALL show a bare 🏆 with no multiplier; when it has more than one, the card SHALL show 🏆 followed by a `×N` multiplier where N is the win count. When the archetype has no first-place deck, no trophy SHALL be shown. The trophy SHALL render inline after the archetype name, in a smaller font than the name, and SHALL NOT prevent the archetype name from truncating with an ellipsis. The 🏆 is a deliberate, scoped exception to the project's "no emoji" rule, permitted solely to mark event wins.

#### Scenario: A single win shows a bare trophy
- **WHEN** an archetype in the displayed view has exactly one first-place deck
- **THEN** its card shows a 🏆 after the archetype name with no multiplier

#### Scenario: Multiple wins show a multiplier
- **WHEN** an archetype in the displayed view has more than one first-place deck
- **THEN** its card shows 🏆 followed by `×N`, where N is the number of first-place decks

#### Scenario: No wins shows no trophy
- **WHEN** an archetype in the displayed view has no first-place deck
- **THEN** its card shows no trophy indicator

#### Scenario: Win count reflects the active filters
- **WHEN** an event filter is applied so the displayed decks are a single event
- **THEN** each archetype's trophy count reflects only that event's first-place decks (at most one archetype shows a bare 🏆)

#### Scenario: Trophy has a localized accessible label
- **WHEN** the trophy renders and the active locale is English or Spanish
- **THEN** it carries a localized, count-aware accessible label (e.g. "1 event win" / "3 event wins"; "1 victoria" / "3 victorias")

#### Scenario: Trophy does not crowd out the archetype name
- **WHEN** an archetype with a long name and at least one win renders
- **THEN** the archetype name truncates with an ellipsis while the trophy remains fully visible after it
