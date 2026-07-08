## ADDED Requirements

### Requirement: Placement result label format
Each deck row (in the expanded archetype card and in the decklist modal) SHALL render the deck's finish from its raw MTGTop8 placement text as a short competitive label, kept in English in both locales. The label SHALL be derived as: a 1st-place finish renders "1st"; a 2nd-place finish renders "2nd"; any finish whose best standing is 4th or better (e.g. "3-4", "4") renders "Top 4"; a **bracket range** deeper than that (both a lower and an upper bound, e.g. "5-8", "9-16", "17-32") renders "Top {upper bound}" (e.g. "Top 8", "Top 16", "Top 32"); a **single integer standing of 8th or better** (e.g. "5", "8") renders "Top {n}"; a **single integer standing worse than 8th** (e.g. "9", "14") renders the bare number with no "Top" prefix (e.g. "9", "14"); and an unparseable or empty placement renders the raw text, or "—" when empty. The badge's semantic colour SHALL be unaffected by this label rule (it continues to reflect the finish kind: 1st, 2nd, Top 4, or other).

#### Scenario: Podium and top-4 finishes
- **WHEN** a deck's placement is "1", "2", or "3-4" (or "4")
- **THEN** its row shows "1st", "2nd", or "Top 4" respectively

#### Scenario: Bracket ranges keep the "Top" prefix
- **WHEN** a deck's placement is a range such as "5-8", "9-16", or "17-32"
- **THEN** its row shows "Top 8", "Top 16", or "Top 32" (the upper bound), regardless of whether the upper bound exceeds 8

#### Scenario: Single standing above 8th shows the bare number
- **WHEN** a deck's placement is a single integer greater than 8 (e.g. "9", "12", "14")
- **THEN** its row shows that number with no "Top" prefix (e.g. "9", "12", "14")

#### Scenario: Single standing of 8th or better keeps the "Top" prefix
- **WHEN** a deck's placement is a single integer from 5 to 8 (e.g. "8")
- **THEN** its row shows "Top {n}" (e.g. "Top 8")

#### Scenario: Unparseable placement falls back to raw text
- **WHEN** a deck's placement is empty or has no numeric standing (e.g. "", "DNF")
- **THEN** its row shows "—" for empty, or the raw text otherwise
