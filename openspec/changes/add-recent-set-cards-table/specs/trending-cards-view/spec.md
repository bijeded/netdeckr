# Spec Delta

## ADDED Requirements

### Requirement: Top New Cards table

The dashboard SHALL display a "Top New Cards" / "Top Cartas Nuevas" table of the top 10 cards printed in either recent main set, ranked by total copies over mainboard and sideboard combined, with no subtitle. Each row SHALL show a zero-padded rank, the card name, a set-code chip, and the total copy count (mono), plus a header row; it SHALL NOT show an average-copies-per-deck column or a copy-share percentage.

#### Scenario: Ranked by combined copies
- **WHEN** the active slice's decks play cards printed in `FRA` or `HOB`, in either board
- **THEN** the table lists the top 10 of them by total copies across both boards, each showing rank, name, set-code chip, and copy count

#### Scenario: Reprints and nonbasic lands appear
- **WHEN** a heavily played reprint in `FRA` and a nonbasic land from `HOB` are in the slice
- **THEN** both are eligible for the table, while basic lands never appear

#### Scenario: Set-code chip
- **WHEN** a row's card is recorded with set code `HOB`
- **THEN** its chip reads `HOB` in the mono typeface, in both locales

#### Scenario: Localized title
- **WHEN** the UI language is English then Spanish
- **THEN** the title reads "Top New Cards" then "Top Cartas Nuevas", with no subtitle, while card names and set codes stay unchanged

### Requirement: Top New Cards follows the trending slice

The Top New Cards table SHALL recompute for the selected time frame and SHALL respect the same archetype, tier, event, and event-size filters and the same legal-decks-only rule as the other trending tables. It SHALL show a localized empty state when the slice has no eligible card, and its card names SHALL use the same art preview as the other trending tables.

#### Scenario: Time frame and filters
- **WHEN** the user switches the time frame or applies an archetype, tier, event, or event-size filter
- **THEN** the table's ranking and copy counts recompute over the same slice as the other trending tables

#### Scenario: Banned decks excluded
- **WHEN** a deck in the window holds a card banned in the format
- **THEN** none of its cards contributes to the table

#### Scenario: Empty slice
- **WHEN** no deck in the slice plays a card printed in either recent main set
- **THEN** the table shows a localized empty state

#### Scenario: Art preview
- **WHEN** the user hovers or touches a row's card name whose art is resolved
- **THEN** the card's art previews via the existing `CardArtPreview` behavior

### Requirement: Top New Cards hidden in Pre-Modern

The Top New Cards table SHALL NOT be rendered when the selected format is Pre-Modern, whose card pool receives no new sets; the other three trending tables SHALL render as usual there.

#### Scenario: Pre-Modern selected
- **WHEN** the selected format is Pre-Modern
- **THEN** the Top New Cards table is absent and Top Creatures, Top Spells, and Top Sideboard Cards still render

#### Scenario: Other formats
- **WHEN** the selected format is Standard, Pioneer, Modern, or Pauper
- **THEN** the Top New Cards table is rendered

### Requirement: Responsive trending grid

On desktop widths the trending tables SHALL sit in a two-column grid: Top Creatures and Top Spells in the first row, Top Sideboard Cards and Top New Cards in the second, each roughly half the width. When Top New Cards is hidden (Pre-Modern), Top Sideboard Cards SHALL keep its position in the second row. Below ~900px the tables SHALL stack vertically in the order Creatures → Spells → Sideboard → New Cards. The layout MUST stay legible at small widths (per the responsive convention).

#### Scenario: Desktop 2x2
- **WHEN** the dashboard is viewed at a desktop width in a format other than Pre-Modern
- **THEN** Top Creatures and Top Spells render side by side in the first row, and Top Sideboard Cards and Top New Cards side by side in the second, each ~1/2 wide

#### Scenario: Desktop without Top New Cards
- **WHEN** the dashboard is viewed at a desktop width in Pre-Modern
- **THEN** Top Creatures and Top Spells fill the first row and Top Sideboard Cards sits in the second row's first column

#### Scenario: Mobile stacked
- **WHEN** the dashboard is viewed at a narrow width (below ~900px)
- **THEN** the tables stack vertically in the order Creatures, Spells, Sideboard, New Cards, and stay legible

## REMOVED Requirements

### Requirement: Responsive trending layout
**Reason**: The trending area grows to four tables, and four equal columns leave too little width for card names; it becomes a 2x2 grid (see "Responsive trending grid").
**Migration**: Replaced by "Responsive trending grid", which keeps the ~900px stacking breakpoint and the Creatures → Spells → Sideboard order, appending New Cards.
