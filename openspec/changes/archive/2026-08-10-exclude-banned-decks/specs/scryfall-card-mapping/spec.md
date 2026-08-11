## ADDED Requirements

### Requirement: Per-format banned status is read from the bulk data

The bulk card-data sync SHALL additionally expose, for each card, whether it is banned in each of the five supported formats, reading the per-format legality information carried on the bulk records. This SHALL require no extra download and no per-card REST request: it reads fields already present on the records the sync streams.

A card is banned in a format only when its legality in that format is reported as `banned`. Any other status — including `restricted`, `not_legal`, and `legal` — SHALL NOT be reported as banned.

A record carrying no legality information SHALL be treated as banned in no format, so a missing field can only under-report a ban and never invent one.

Because the bulk data holds multiple printings per card and legality is a property of the card rather than the printing, the banned status SHALL be resolved per card name, consistently with how printings are already collapsed to one entry per name.

#### Scenario: Banned status surfaced per format

- **WHEN** the sync builds its card index from the bulk data
- **THEN** each card's banned status is available for Standard, Pioneer, Modern, Pauper, and Pre-Modern individually

#### Scenario: Only the banned status counts

- **WHEN** a card's legality in a format is `restricted`, `not_legal`, or `legal`
- **THEN** it is not reported as banned in that format

#### Scenario: Missing legality information is not a ban

- **WHEN** a bulk record carries no legality information
- **THEN** the card is reported as banned in no format

#### Scenario: No additional network access

- **WHEN** banned status is determined
- **THEN** it comes from the already-downloaded bulk file, with no per-card REST request and no second download
