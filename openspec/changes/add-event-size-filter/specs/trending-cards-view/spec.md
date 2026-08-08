## MODIFIED Requirements

### Requirement: Trending respects active filters

The trending tables SHALL respect the sidebar filters. An active archetype or tier filter narrows the computation to that slice's decks; an active event filter narrows it to that event's decks; an active event-size filter narrows it to the decks of events in that size class. Copy counts and average-copies-per-deck are recomputed within the active slice.

#### Scenario: Archetype or tier filter active
- **WHEN** an archetype or tier filter is applied
- **THEN** copy counts and averages are computed only over that filtered slice's decks

#### Scenario: Event filter active
- **WHEN** an event filter is applied
- **THEN** copy counts and averages are recomputed within that event's decks

#### Scenario: Event-size filter active
- **WHEN** an event-size class is selected
- **THEN** copy counts and averages are recomputed over only the decks of events in that size class

#### Scenario: Filters cleared
- **WHEN** all filters are cleared
- **THEN** the tables revert to the full format + time-frame slice
