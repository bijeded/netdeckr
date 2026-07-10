## ADDED Requirements

### Requirement: Trending mainboard cards table

The dashboard SHALL display an "En Tendencia" / "Trending" table of the top 10 mainboard cards for the current metagame view, ranked by **copy share** — each card's total mainboard copies across the window's decks divided by the total mainboard copies of all cards in that slice. Copies MUST be summed across decks so a 4-of contributes four times a 1-of. **Basic lands** (Scryfall `type_line` containing "Basic Land") MUST be excluded from the ranking; nonbasic lands are retained. Each row SHALL show a zero-padded rank, the card name, `% actual` (current copy share), `% anterior` (preceding-window copy share), and a ▲/▼/– change indicator with a signed percentage-point value. Card names are in English in both locales; all other chrome is localized (ES/EN).

#### Scenario: Ranked by copy share
- **WHEN** the selected format and time frame have decks with mainboard cards
- **THEN** the table lists the top 10 non-basic-land cards by copy share, each showing rank, name, `% actual` as a mono one-decimal percentage, `% anterior`, and the change indicator

#### Scenario: Copies are weighted
- **WHEN** a card appears as a 4-of in some decks and a 1-of in others
- **THEN** its copy share reflects the summed copies (a 4-of contributes four times a 1-of), not deck presence

#### Scenario: Basic lands excluded
- **WHEN** the window's mainboards contain basic lands (Plains, Island, Swamp, Mountain, Forest, Wastes, snow basics)
- **THEN** those basic lands do not appear in the table, while nonbasic lands remain eligible

### Requirement: Time-frame-aware trending and period delta

The trending table SHALL recompute its ranking and percentages for the selected time frame (`5days`/`2weeks`). The `% anterior` and change indicator SHALL compare the selected window against the immediately-preceding equal-length window (5 days vs the prior 5 days; 14 days vs the prior 14 days), derived client-side from the widened corpus.

#### Scenario: Switching the time frame
- **WHEN** the user switches between Last 5 Days and 2 Weeks
- **THEN** both the ranking and the percentages recompute for that window, and the previous period is the immediately-preceding equal-length window

#### Scenario: New card this period
- **WHEN** a card is present in the current window but absent in a populated preceding window
- **THEN** its change indicator reads as a ▲ of its full current copy share

#### Scenario: Negligible change
- **WHEN** the change between periods is within the flat deadband
- **THEN** the indicator shows – (flat) with 0.0

### Requirement: Trending respects active filters

The trending tables SHALL respect the sidebar filters. An active archetype or tier filter narrows the computation to that slice's decks, and the period delta still compares equal-length preceding and current windows of that slice. An active **event** filter recomputes the copy share within that event's decks but SHALL suppress the `% anterior`/change column, because a single point-in-time event has no meaningful preceding period.

#### Scenario: Archetype or tier filter active
- **WHEN** an archetype or tier filter is applied
- **THEN** copy share is computed only over that filtered slice's decks and the change indicator still compares equal-length windows of that slice

#### Scenario: Event filter active
- **WHEN** an event filter is applied
- **THEN** copy share is recomputed within that event's decks and the `% anterior`/change column is suppressed

#### Scenario: Filters cleared
- **WHEN** all filters are cleared
- **THEN** the tables revert to the full format + time-frame slice with the change column shown

### Requirement: Delta safety and empty states

The `% anterior`/change column SHALL be suppressed field-wide when the immediately-preceding window for the active slice holds fewer than the minimum number of decks. When the active slice has no decks (or no cards for the relevant board), the section SHALL show a localized empty state instead of an empty table.

#### Scenario: Thin preceding data
- **WHEN** the preceding window for the active slice holds fewer than the minimum decks
- **THEN** the `% anterior` and change column are suppressed field-wide while the current `% actual` is still shown

#### Scenario: No decks in slice
- **WHEN** the active slice has no decks
- **THEN** a localized empty state is shown instead of the table

### Requirement: Top Sideboard Cards list

The dashboard SHALL display a "Top Sideboard Cards" list of the top 10 cards by copy share computed over `board='side'` only, showing rank, card name, and percentage — with **no** previous-period or change columns. It SHALL respect the same slice (format, time frame, archetype/tier/event filters) as the trending mainboard table, exclude basic lands, and show a localized empty state when the slice has no sideboard cards.

#### Scenario: Sideboard cards ranked
- **WHEN** the active slice has sideboard cards
- **THEN** the list shows the top 10 by copy share over `board='side'` with rank, card name, and percentage, and no previous/change columns

#### Scenario: Sideboard respects slice and time frame
- **WHEN** the user changes the time frame or applies a filter
- **THEN** the sideboard ranking and percentages recompute for the same slice as the trending table

#### Scenario: No sideboard cards
- **WHEN** the active slice has no sideboard cards
- **THEN** a localized empty state is shown

### Requirement: Responsive trending layout

On desktop widths the trending mainboard table and the Top Sideboard Cards list SHALL sit side by side, with the trending table taking roughly two-thirds of the width and the sideboard list roughly one-third. On mobile widths the two SHALL stack vertically with the trending table above the sideboard list. The layout MUST stay legible at small widths (per the responsive convention).

#### Scenario: Desktop side-by-side
- **WHEN** the dashboard is viewed at a desktop width
- **THEN** the trending table (~2/3) and the Top Sideboard Cards list (~1/3) render side by side

#### Scenario: Mobile stacked
- **WHEN** the dashboard is viewed at a mobile width
- **THEN** the trending table renders above the Top Sideboard Cards list, stacked vertically and legible

### Requirement: Card art preview in trending tables

Each card row in the trending and sideboard tables SHALL preview the card's full Scryfall art on hover (mouse) or touch (mobile) of its name, reusing the existing `CardArtPreview` behavior, and gracefully render nothing extra when art is unavailable.

#### Scenario: Preview on hover or touch
- **WHEN** the user hovers (mouse) or touches (mobile) a card name whose Scryfall art is resolved
- **THEN** the card's full art previews via the existing `CardArtPreview` behavior

#### Scenario: Unresolved art
- **WHEN** a card has no resolved Scryfall art
- **THEN** no preview is shown and the row renders normally
