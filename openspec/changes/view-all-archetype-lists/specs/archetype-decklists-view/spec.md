# Spec Delta

## MODIFIED Requirements

### Requirement: Expand an archetype to its recent decklists
The system SHALL allow the user to expand an archetype in the metagame breakdown to reveal a list of that archetype's decklists for the currently selected format and time window. When the archetype has decks that finished 1st, 2nd, or Top 4 (placings 1, 2, and 3–4), the expanded list SHALL show up to its 6 most recent such top-finishing decks (by event date, most recent first). When the archetype has no such top-finishing decks, the expanded list SHALL instead show its latest 6 decklists by event date (most recent first) as a fallback. Each deck row SHALL display the deck's placing/result, the player name, the event name and date, and the archetype's color-identity pips. Only archetypes that have at least one stored decklist for the current `(format, window)` SHALL present an expand affordance.

#### Scenario: Expand an archetype with top-finishing decklists
- **WHEN** a format and time window are selected and the user clicks an archetype card that has at least one 1st, 2nd, or Top 4 decklist for that format and window
- **THEN** the card expands to show deck rows for up to its 6 most recent top finishes, each displaying placing/result, player name, event name and date, and the archetype's color pips

#### Scenario: More than 6 top finishes are capped at the 6 most recent
- **WHEN** an archetype has more than 6 decks that finished 1st, 2nd, or Top 4 for the current format and window
- **THEN** the expanded card shows exactly 6 of them, the 6 with the most recent event dates

#### Scenario: Fall back to the latest 4 lists when there are no top finishes
- **WHEN** an archetype has stored decklists for the current format and window but none finished 1st, 2nd, or Top 4
- **THEN** the card expands to show its latest 6 decklists by event date (most recent first)

#### Scenario: Archetype with no decklists is not expandable
- **WHEN** an archetype has zero stored decklists for the current format and window
- **THEN** the archetype card presents no expand affordance and cannot be expanded

#### Scenario: Collapse an expanded archetype
- **WHEN** an archetype card is expanded and the user collapses it
- **THEN** the card returns to its collapsed grid state

#### Scenario: Deck rows follow the active filters
- **WHEN** an archetype is expanded and the user changes the format or time window
- **THEN** the deck rows update to decks matching the new format and window, or the card collapses if none exist for the new selection

## ADDED Requirements

### Requirement: Open the archetype's full view from an expanded card
An expanded archetype card that is not already isolated SHALL show a localized "View all lists →" control in its recent-decklists header. Activating it SHALL open the isolated archetype view for that archetype, the same state as selecting it in the Archetype filter, and bring that view's top into sight. The control SHALL stand out from the deck rows' "go to deck →" links and SHALL NOT reuse the share-delta trend colors.

#### Scenario: Control appears on an expanded card
- **WHEN** the user expands an archetype card in the grid with no archetype isolated
- **THEN** the card's recent-decklists header shows a "View all lists →" control (localized)

#### Scenario: Control opens the isolated archetype view
- **WHEN** the user activates "View all lists →" on an expanded archetype card
- **THEN** the dashboard shows the isolated view for that archetype, exactly as if it had been selected in the Archetype filter, with the Archetype filter showing that archetype and the caption naming it

#### Scenario: The isolated view's top is brought into sight
- **WHEN** the user activates "View all lists →" on a card positioned below the top of the grid
- **THEN** the view scrolls so the format header and grid caption of the isolated view are visible

#### Scenario: Control is absent on an already-isolated card
- **WHEN** an archetype is isolated and its card is auto-expanded
- **THEN** its recent-decklists header shows no "View all lists →" control

#### Scenario: Control stands out from the deck-row links
- **WHEN** an expanded card shows both the "View all lists →" control and its deck rows
- **THEN** the control is visibly emphasized relative to the deck rows' "go to deck →" links, and its accent is not the share-delta trend colors

#### Scenario: Control is reachable on mobile
- **WHEN** the viewport is narrow and an archetype card is expanded
- **THEN** the "View all lists →" control is visible in the recent-decklists header without horizontal scrolling and remains a comfortable tap target
