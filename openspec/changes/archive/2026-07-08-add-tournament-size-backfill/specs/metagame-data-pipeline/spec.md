## ADDED Requirements

### Requirement: One-time event-size backfill mode
The system SHALL provide a standalone `--backfill-sizes` maintenance mode that populates `events.player_count` on already-stored events whose size is null, by fetching each such event's page and parsing its reported player count. The mode SHALL update an event's `player_count` only when a size is found (a miss leaves the row null), SHALL NOT re-fetch or modify decks or deck cards, and SHALL be idempotent (safe to re-run). The pass SHALL be exposed as a workflow-dispatch option so it can be triggered once against the stored corpus, and the size-parsing it relies on SHALL be unit-tested against saved fixtures without making a network request.

#### Scenario: Backfill fills a null size from the event page
- **WHEN** the backfill runs and a stored event with a null player count has an event page that reports a size
- **THEN** that event's `player_count` is set to the reported size

#### Scenario: A page with no reported size is left null
- **WHEN** the backfill fetches a stored event whose page reports no size
- **THEN** that event's `player_count` remains null and the pass continues

#### Scenario: Backfill does not touch decks or cards
- **WHEN** the backfill runs
- **THEN** it updates only `events.player_count` and does not fetch decklists or modify decks or deck cards

#### Scenario: One event failure does not abort the pass
- **WHEN** fetching or parsing one event's page raises an error during the backfill
- **THEN** the remaining events are still processed
