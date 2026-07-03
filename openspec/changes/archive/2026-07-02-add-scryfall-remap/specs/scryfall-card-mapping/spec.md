## ADDED Requirements

### Requirement: Existing rows can be fully re-resolved (remap)
The system SHALL provide a full re-resolution ("remap") pass over existing `deck_cards` rows that, unlike the sentinel-keyed backfills, considers every distinct `card_name` in the table (not only rows with a null column). For each distinct name that resolves to a printing under the current resolver, the pass SHALL rewrite all Scryfall columns on every row with that name — `scryfall_name`, `set_code`, `collector_number`, `image_url`, `type_line`, `rarity`, `cmc`, and `released_at` — so that later resolver, printing-selection, or metadata heuristic changes reach already-enriched rows. A name that does not resolve (a miss) SHALL be skipped entirely, leaving its existing columns untouched, so a resolution regression cannot null out good data. The pass SHALL be idempotent: with a deterministic resolver, re-running it produces the same result.

#### Scenario: Remap rewrites an already-enriched row when the resolver changes
- **WHEN** the remap pass runs and a distinct card name resolves to a printing (even for rows already carrying Scryfall data)
- **THEN** every row with that name is rewritten with the current printing's canonical name, set code, collector number, image URL, type line, rarity, cmc, and set release date

#### Scenario: Remap never nulls out data on a miss
- **WHEN** the remap pass encounters a distinct card name that does not resolve under the current resolver
- **THEN** it does not write those rows, and their existing column values are left unchanged

#### Scenario: Remap is idempotent
- **WHEN** the remap pass runs again after a prior successful run with no resolver change
- **THEN** the rewritten values are identical and no data is corrupted
