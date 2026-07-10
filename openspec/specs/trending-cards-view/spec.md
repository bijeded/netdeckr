# trending-cards-view

## Purpose
The dashboard's trending-cards surface: an "En Tendencia" / "Trending" mainboard table (top cards ranked by copy share, with a total copy count) and a Top Sideboard Cards list, both derived at read time from the scraped decks via the `top_cards` aggregation. Lands are excluded so the tables show spells and creatures; the tables are time-frame aware, respect the sidebar filters, and localize their chrome (ES/EN) while keeping card names in English.

## Requirements

### Requirement: Trending mainboard cards table

The dashboard SHALL display an "En Tendencia" / "Trending" table of the top 10 mainboard cards for the current metagame view, ranked by **copy share** — each card's total mainboard copies across the window's decks divided by the total mainboard copies of all eligible cards in that slice. Copies MUST be summed across decks so a 4-of contributes four times a 1-of. **Lands** (basic and nonbasic — any card whose Scryfall `type_line` contains "Land") MUST be excluded from the ranking and the share denominator, so the table shows spells and creatures rather than manabase. Each row SHALL show a zero-padded rank, the card name, the copy share (mono, one decimal), and the **total number of copies** of that card in the slice (mono integer). The table does NOT show a period-over-period delta. Card names are in English in both locales; all other chrome is localized (ES/EN).

#### Scenario: Ranked by copy share with a copy count
- **WHEN** the selected format and time frame have decks with eligible mainboard cards
- **THEN** the table lists the top 10 non-land cards by copy share, each showing rank, name, copy share as a mono one-decimal percentage, and the total copies as a mono integer

#### Scenario: Copies are weighted
- **WHEN** a card appears as a 4-of in some decks and a 1-of in others
- **THEN** its copy share and copy count reflect the summed copies (a 4-of contributes four times a 1-of), not deck presence

#### Scenario: Lands excluded
- **WHEN** the window's mainboards contain lands (basic lands, dual lands, fetchlands, Urza's Saga, etc.)
- **THEN** none of them appear in the table, and they do not count toward the share denominator

### Requirement: Time-frame-aware trending

The trending table SHALL recompute its ranking, copy share, and copy count for the selected time frame (`5days`/`2weeks`).

#### Scenario: Switching the time frame
- **WHEN** the user switches between Last 5 Days and 2 Weeks
- **THEN** the ranking, percentages, and copy counts recompute for that window

### Requirement: Trending respects active filters

The trending tables SHALL respect the sidebar filters. An active archetype or tier filter narrows the computation to that slice's decks; an active event filter narrows it to that event's decks. Copy share and copy count are recomputed within the active slice.

#### Scenario: Archetype or tier filter active
- **WHEN** an archetype or tier filter is applied
- **THEN** copy share and copy count are computed only over that filtered slice's decks

#### Scenario: Event filter active
- **WHEN** an event filter is applied
- **THEN** copy share and copy count are recomputed within that event's decks

#### Scenario: Filters cleared
- **WHEN** all filters are cleared
- **THEN** the tables revert to the full format + time-frame slice

### Requirement: Trending empty state

When the active slice has no eligible cards for a table's board, that table SHALL show a localized empty state instead of an empty grid.

#### Scenario: No cards in slice
- **WHEN** the active slice has no eligible mainboard cards
- **THEN** the trending table shows a localized empty state instead of the table

### Requirement: Top Sideboard Cards list

The dashboard SHALL display a "Top Sideboard Cards" list of the top 10 cards by copy share computed over `board='side'` only, showing rank, card name, and copy-share percentage. It SHALL respect the same slice (format, time frame, archetype/tier/event filters) as the trending mainboard table, exclude lands, and show a localized empty state when the slice has no sideboard cards.

#### Scenario: Sideboard cards ranked
- **WHEN** the active slice has sideboard cards
- **THEN** the list shows the top 10 by copy share over `board='side'` with rank, card name, and percentage

#### Scenario: Sideboard respects slice and time frame
- **WHEN** the user changes the time frame or applies a filter
- **THEN** the sideboard ranking and percentages recompute for the same slice as the trending table

#### Scenario: No sideboard cards
- **WHEN** the active slice has no sideboard cards
- **THEN** a localized empty state is shown

### Requirement: Card art preview in trending tables

Each card row in the trending and sideboard tables SHALL preview the card's full Scryfall art on hover (mouse) or touch (mobile) of its name, reusing the existing `CardArtPreview` behavior, and gracefully render nothing extra when art is unavailable.

#### Scenario: Preview on hover or touch
- **WHEN** the user hovers (mouse) or touches (mobile) a card name whose Scryfall art is resolved
- **THEN** the card's full art previews via the existing `CardArtPreview` behavior

#### Scenario: Unresolved art
- **WHEN** a card has no resolved Scryfall art
- **THEN** no preview is shown and the row renders normally

### Requirement: Responsive trending layout

On desktop widths the trending mainboard table and the Top Sideboard Cards list SHALL sit side by side, with the trending table taking roughly two-thirds of the width and the sideboard list roughly one-third. On mobile widths the two SHALL stack vertically with the trending table above the sideboard list. The layout MUST stay legible at small widths (per the responsive convention).

#### Scenario: Desktop side-by-side
- **WHEN** the dashboard is viewed at a desktop width
- **THEN** the trending table (~2/3) and the Top Sideboard Cards list (~1/3) render side by side

#### Scenario: Mobile stacked
- **WHEN** the dashboard is viewed at a mobile width
- **THEN** the trending table renders above the Top Sideboard Cards list, stacked vertically and legible
