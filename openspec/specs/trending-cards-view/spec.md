# trending-cards-view

## Purpose
The dashboard's trending-cards surface: three tables derived at read time from the scraped decks via the `top_cards` aggregation — **Top Creatures** and **Top Spells** (the mainboard split by card type) and a **Top Sideboard Cards** table. Each ranks its slice by total copies; the mainboard tables also show an average-copies-per-deck value. Lands are excluded so the tables show spells and creatures; the tables are time-frame aware, respect the sidebar filters, and localize their chrome (ES/EN) while keeping card names in English.

## Requirements

### Requirement: Trending Creatures table

The dashboard SHALL display a "Top Creatures" / "Top Criaturas" table of the top 10 **mainboard creatures** for the current metagame view, ranked by **total copies** across the window's decks (copies summed across decks, so a 4-of contributes four times a 1-of). A card is a creature when its Scryfall `type_line` contains "Creature". Because a stored type line describes the single face the deck plays rather than a multi-face card's combined line, a card SHALL NOT be counted as a creature on the strength of a face the deck does not play: a sorcery whose other face is a creature belongs in Top Spells, not here. **Lands** MUST be excluded, by the same single-face test. Each row SHALL show a zero-padded rank, the card name, an **average-copies-per-deck** value, and the **total copy count** (both mono). Average copies per deck is `total copies ÷ distinct decks running the card`, rounded to a whole number and rendered as `Nx` (e.g. `3x`). The table does NOT show a copy-share percentage. Card names are in English in both locales; all other chrome (including the "Top Creatures"/"Top Criaturas" title) is localized (ES/EN).

#### Scenario: Ranked by total copies
- **WHEN** the selected format and time frame have decks with mainboard creatures
- **THEN** the table lists the top 10 creatures by total copies, each showing rank, name, average copies per deck as `Nx`, and the total copy count

#### Scenario: Average copies per deck
- **WHEN** a creature has 34 total copies across 10 decks that run it
- **THEN** its average column shows `3x` (34 ÷ 10 = 3.4, rounded)

#### Scenario: Only creatures and no lands
- **WHEN** the window's mainboards contain creatures, non-creature spells, and lands
- **THEN** only creatures appear in this table, and no land appears

#### Scenario: A multi-face card is classified by the played face
- **WHEN** a mainboard card is a sorcery whose other face is a creature
- **THEN** it does not appear in this table

#### Scenario: Localized title
- **WHEN** the UI language is English then Spanish
- **THEN** the table title reads "Top Creatures" then "Top Criaturas", while card names stay in English

### Requirement: Trending Spells table

The dashboard SHALL display a "Top Spells" / "Top Hechizos" table of the top 10 **mainboard non-land, non-creature cards** for the current metagame view, ranked by total copies (summed across decks). A card belongs here when its Scryfall `type_line` contains neither "Land" nor "Creature". That type line describes the single face the deck plays, so a card whose *other* face is a land or a creature belongs here — a modal double-faced card played as a sorcery is a spell, and a sorcery that transforms into a creature is a spell. Each row SHALL show a zero-padded rank, the card name, the average-copies-per-deck value (`Nx`, computed as for creatures), and the total copy count (both mono). The table does NOT show a copy-share percentage. Card names stay English in both locales; other chrome (including the "Top Spells"/"Top Hechizos" title) is localized.

#### Scenario: Ranked by total copies
- **WHEN** the selected format and time frame have decks with mainboard non-creature spells
- **THEN** the table lists the top 10 non-land non-creature cards by total copies, each showing rank, name, average copies per deck as `Nx`, and the total copy count

#### Scenario: Creatures and lands excluded
- **WHEN** the window's mainboards contain creatures, non-creature spells, and lands
- **THEN** only non-land non-creature cards appear in this table

#### Scenario: A modal double-faced land-spell counts as a spell
- **WHEN** a mainboard card's played face is a sorcery and its other face is a land
- **THEN** it is eligible for this table and does not appear in Top Creatures

#### Scenario: A transforming sorcery counts as a spell
- **WHEN** a mainboard card's played face is a sorcery and its other face is a creature
- **THEN** it is eligible for this table

#### Scenario: Localized title
- **WHEN** the UI language is English then Spanish
- **THEN** the table title reads "Top Spells" then "Top Hechizos", while card names stay in English

### Requirement: Time-frame-aware trending

The trending tables (Creatures, Spells, Sideboard) SHALL recompute their ranking, copy counts, and average-copies-per-deck for the selected time frame (`5days`/`2weeks`).

#### Scenario: Switching the time frame
- **WHEN** the user switches between Last 5 Days and 2 Weeks
- **THEN** the rankings, copy counts, and average values recompute for that window

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

### Requirement: Trending empty state

When the active slice has no eligible cards for a table's board, that table SHALL show a localized empty state instead of an empty grid.

#### Scenario: No cards in slice
- **WHEN** the active slice has no eligible mainboard cards
- **THEN** the trending table shows a localized empty state instead of the table

### Requirement: Top Sideboard Cards list

The dashboard SHALL display a "Top Sideboard Cards" table of the top 10 cards by **total copies** computed over `board='side'` only, showing rank, card name, and the total copy count (mono). It SHALL render a header row matching the mainboard tables (for height parity) and does NOT show a copy-share percentage or an average-copies-per-deck column. It SHALL respect the same slice (format, time frame, archetype/tier/event filters) as the mainboard tables, exclude lands, and show a localized empty state when the slice has no sideboard cards.

#### Scenario: Sideboard cards ranked
- **WHEN** the active slice has sideboard cards
- **THEN** the table shows a header row and the top 10 by total copies over `board='side'` with rank, card name, and copy count

#### Scenario: Sideboard respects slice and time frame
- **WHEN** the user changes the time frame or applies a filter
- **THEN** the sideboard ranking and copy counts recompute for the same slice as the mainboard tables

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

On desktop widths the three trending tables (Trending Creatures, Trending Spells, Top Sideboard Cards) SHALL sit side by side, each taking roughly one-third of the width. Below ~900px the three SHALL stack vertically in the order Creatures → Spells → Sideboard. The layout MUST stay legible at small widths (per the responsive convention).

#### Scenario: Desktop three-up
- **WHEN** the dashboard is viewed at a desktop width
- **THEN** Trending Creatures, Trending Spells, and Top Sideboard Cards render side by side, each ~1/3 wide

#### Scenario: Mobile stacked
- **WHEN** the dashboard is viewed at a narrow width (below ~900px)
- **THEN** the three tables stack vertically in the order Creatures, Spells, Sideboard, and stay legible

### Requirement: Trending tables count only legal decks

The trending tables (Creatures, Spells, Sideboard) SHALL be computed over the format's legal decks only. A deck holding a card banned in that format SHALL contribute nothing to any copy count, distinct-deck count, or average-copies-per-deck value — neither the banned card itself nor the legal cards played alongside it.

This SHALL hold in every combination with the existing filters: the legality exclusion applies first, and the archetype, tier, event, and event-size filters then narrow what remains.

A banned card SHALL therefore never appear in a trending table, since every deck that could have contributed it is excluded.

#### Scenario: Banned card is absent from the tables

- **WHEN** a card is banned in the selected format and decks in the window still contain it
- **THEN** it does not appear in the Trending Creatures, Trending Spells, or Top Sideboard Cards tables

#### Scenario: The rest of an illegal deck is excluded too

- **WHEN** a deck holding a banned card also contains legal cards
- **THEN** those legal cards receive no copies and no deck count from that deck, and its exclusion is visible in the averages

#### Scenario: Exclusion combines with the sidebar filters

- **WHEN** an archetype, tier, event, or event-size filter is active after a ban
- **THEN** the tables are computed over the legal decks within that filtered slice

#### Scenario: A format with no bans is unaffected

- **WHEN** the selected format's banlist matches nothing in the window
- **THEN** the tables show exactly what they would have shown without the exclusion
