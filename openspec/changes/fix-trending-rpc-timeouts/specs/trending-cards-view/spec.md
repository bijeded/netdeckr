# Spec Delta

## ADDED Requirements

### Requirement: Trending load failure shows an error state

When the trending data for the Creatures, Spells and Sideboard tables fails to load, each of those tables SHALL show a localized error message (ES/EN) instead of its empty state, so a failed load is never presented as a slice with no cards. A slice that loads successfully with no eligible cards SHALL keep showing the empty state.

#### Scenario: Trending data fails to load
- **WHEN** the mainboard or sideboard trending data cannot be loaded
- **THEN** Top Creatures, Top Spells and Top Sideboard Cards each show the localized error message, not their empty-state text

#### Scenario: Successful load with no cards
- **WHEN** the trending data loads and the slice has no eligible cards for a table
- **THEN** that table shows its localized empty state, not the error message

#### Scenario: Error message localized
- **WHEN** a trending load fails and the language is Spanish
- **THEN** the error message is shown in Spanish

### Requirement: Trending load failures are reported

Every failed trending load, including a Top New Cards failure on its own, SHALL be reported to the error-tracking service. Reporting SHALL NOT change what the tables render, and SHALL do nothing when error tracking is not configured.

#### Scenario: Failure reported
- **WHEN** a trending data load fails
- **THEN** the failure is sent to error tracking

#### Scenario: Error tracking not configured
- **WHEN** a trending data load fails and no error-tracking DSN is configured
- **THEN** the tables still show the error state and nothing else breaks

### Requirement: Trending tables load on the largest slices

The trending data SHALL load without hitting the database's statement timeout for every supported format and time frame, unfiltered, including the largest slice (Modern or Pauper, 2 weeks) while the dashboard's other queries run at the same time.

#### Scenario: Modern two-week view
- **WHEN** the user opens Modern with the 2-week time frame and no filters
- **THEN** Top Creatures, Top Spells, Top Sideboard Cards and Top New Cards show their rankings rather than an error

## MODIFIED Requirements

### Requirement: Top New Cards fails independently

A failure to load the Top New Cards data SHALL affect only that table: it SHALL show the localized trending error message, and Top Creatures, Top Spells, and Top Sideboard Cards SHALL render their data as if the failure had not happened.

#### Scenario: Top New Cards data fails to load
- **WHEN** the Top New Cards data cannot be loaded but the other trending data loads
- **THEN** Top New Cards shows the error message and the other three tables show their rankings
