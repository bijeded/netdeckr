# Spec Delta

## ADDED Requirements

### Requirement: Play rate column

Every trending table (Creatures, Spells, Sideboard, New Cards) SHALL show a **Decks** column: the percentage of legal decks in the active slice that run the card, rendered mono as a whole number with `%` (e.g. `38%`), and `<1%` when the rate is above zero but rounds to zero. The denominator counts every legal deck in the slice, whether or not it has the card or a sideboard. The column does not change the ranking.

#### Scenario: Share of decks running the card
- **WHEN** the active slice holds 50 legal decks and 19 of them run a mainboard creature
- **THEN** that creature's Decks value reads `38%`

#### Scenario: Sideboard denominator is every deck
- **WHEN** the active slice holds 40 legal decks, 10 of which have no sideboard, and 6 of the 40 bring a card in the sideboard
- **THEN** that card's Decks value in Top Sideboard Cards reads `15%` (6 ÷ 40), not 20% (6 ÷ 30)

#### Scenario: New cards count either board
- **WHEN** a recent-set card appears in the mainboard of 5 decks and the sideboard of 3 others, out of 40 legal decks in the slice
- **THEN** its Decks value in Top New Cards reads `20%` (8 ÷ 40)

#### Scenario: Denominator matches the dashboard's deck count
- **WHEN** no archetype or tier filter is active
- **THEN** the play-rate denominator equals the deck total shown in the Decks stat card for the same format, time frame, event and event-size filters

#### Scenario: Illegal decks never count
- **WHEN** a deck in the window holds a card banned in the format
- **THEN** it is excluded from the play-rate denominator as well as from every numerator

#### Scenario: Tiny rate
- **WHEN** a ranked card runs in 1 of 300 legal decks
- **THEN** its Decks value reads `<1%`

#### Scenario: Ranking unchanged
- **WHEN** card A has more total copies but a lower play rate than card B
- **THEN** card A still ranks above card B

### Requirement: Play rate trend column

Every trending table SHALL show a **Trend** column: the card's play rate in the selected window minus its play rate in the immediately preceding window of equal length, in percentage points. Each window's rate is computed over that window's own slice, under the same archetype or tier, event-size, and legality rules. It is rendered with the same ▲/▼/– indicator, colors, one-decimal signed value, and ±0.5pp flat deadband as the archetype share delta, with a localized accessible label.

#### Scenario: Rising card
- **WHEN** a card's play rate is 38% in the last 7 days and 31.8% in the 7 days before
- **THEN** its Trend shows ▲ `+6.2` in the up color

#### Scenario: Falling card
- **WHEN** a card's play rate drops from 40% to 38.2% between the preceding and the selected window
- **THEN** its Trend shows ▼ `-1.8` in the down color

#### Scenario: Within the deadband
- **WHEN** a card's play rate changes by 0.4 percentage points
- **THEN** its Trend shows – `0.0` in the flat color

#### Scenario: Card absent from the preceding window
- **WHEN** a card runs in 20% of the selected window's decks and in none of the preceding window's
- **THEN** its Trend shows ▲ `+20.0`

#### Scenario: Two-week window
- **WHEN** the selected time frame is 2 Weeks
- **THEN** the trend compares the last 14 days with the 14 days before them

#### Scenario: Thin preceding window
- **WHEN** the preceding window's slice holds fewer than 3 legal decks
- **THEN** no table shows a trend indicator for any card, and the Trend cells are left blank

#### Scenario: Event filter active
- **WHEN** a single event is selected
- **THEN** the preceding window holds none of that event's decks, so no trend indicator is shown

#### Scenario: Archetype, tier, or event-size filter active
- **WHEN** an archetype, tier, or event-size filter is applied
- **THEN** both windows' play rates are computed over decks of those archetypes, or of events in that size class, in their own window

#### Scenario: Localized label
- **WHEN** a screen reader reads a rising card's Trend in English then Spanish
- **THEN** it announces the play-rate change and its magnitude in that language

### Requirement: Narrow trending tables hide Copies

A trending table SHALL hide its **Copies** column, header included, whenever the table itself is too narrow to give the card name usable width with all six columns. The rule follows the table's rendered width, not the viewport's, because the 2x2 desktop grid and the open or closed sidebar make tables narrow at desktop viewport widths too. Rank, card, Avg, Decks and Trend always stay visible. Ranking is unaffected.

#### Scenario: Phone width
- **WHEN** the dashboard is viewed at a 375px-wide viewport
- **THEN** each trending table shows rank, card, Avg, Decks and Trend, and no Copies column or header

#### Scenario: Wide table
- **WHEN** a trending table renders wide enough for all six columns (e.g. stacked at full content width on a tablet)
- **THEN** it shows rank, card, Avg, Copies, Decks and Trend, in that order

#### Scenario: Narrow table in the desktop grid
- **WHEN** the desktop 2x2 grid leaves a table below the width threshold
- **THEN** that table hides Copies, just as at phone width

## MODIFIED Requirements

### Requirement: Trending Creatures table

The dashboard SHALL display a "Top Creatures" / "Top Criaturas" table of the top 10 **mainboard creatures** for the current metagame view, ranked by **total copies** across the window's decks (copies summed across decks, so a 4-of contributes four times a 1-of). A card is a creature when its Scryfall `type_line` contains "Creature". Because a stored type line describes the single face the deck plays rather than a multi-face card's combined line, a card SHALL NOT be counted as a creature on the strength of a face the deck does not play: a sorcery whose other face is a creature belongs in Top Spells, not here. **Lands** MUST be excluded, by the same single-face test. Each row SHALL show a zero-padded rank, the card name, an **average-copies-per-deck** value, the **total copy count**, the **play rate**, and the **play-rate trend** (all mono). Average copies per deck is `total copies ÷ distinct decks running the card`, rounded to a whole number and rendered as `Nx` (e.g. `3x`). The table does NOT show a copy-share percentage. Card names are in English in both locales; all other chrome (including the "Top Creatures"/"Top Criaturas" title) is localized (ES/EN).

#### Scenario: Ranked by total copies
- **WHEN** the selected format and time frame have decks with mainboard creatures
- **THEN** the table lists the top 10 creatures by total copies, each showing rank, name, average copies per deck as `Nx`, the total copy count, the play rate, and the play-rate trend

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

The dashboard SHALL display a "Top Spells" / "Top Hechizos" table of the top 10 **mainboard non-land, non-creature cards** for the current metagame view, ranked by total copies (summed across decks). A card belongs here when its Scryfall `type_line` contains neither "Land" nor "Creature". That type line describes the single face the deck plays, so a card whose *other* face is a land or a creature belongs here — a modal double-faced card played as a sorcery is a spell, and a sorcery that transforms into a creature is a spell. Each row SHALL show a zero-padded rank, the card name, the average-copies-per-deck value (`Nx`, computed as for creatures), the total copy count, the play rate, and the play-rate trend (all mono). The table does NOT show a copy-share percentage. Card names stay English in both locales; other chrome (including the "Top Spells"/"Top Hechizos" title) is localized.

#### Scenario: Ranked by total copies
- **WHEN** the selected format and time frame have decks with mainboard non-creature spells
- **THEN** the table lists the top 10 non-land non-creature cards by total copies, each showing rank, name, average copies per deck as `Nx`, the total copy count, the play rate, and the play-rate trend

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

The trending tables (Creatures, Spells, Sideboard, New Cards) SHALL recompute their ranking, copy counts, average-copies-per-deck, play rates and play-rate trends for the selected time frame (`7days`/`2weeks`).

#### Scenario: Switching the time frame
- **WHEN** the user switches between Last 7 Days and 2 Weeks
- **THEN** the rankings, copy counts, average values, play rates and trends recompute for that window (and its preceding window of equal length)

### Requirement: Trending respects active filters

The trending tables SHALL respect the sidebar filters. An active archetype or tier filter narrows the computation to that slice's decks; an active event filter narrows it to that event's decks; an active event-size filter narrows it to the decks of events in that size class. Copy counts, average-copies-per-deck, play rates (numerator and denominator) and play-rate trends are recomputed within the active slice.

#### Scenario: Archetype or tier filter active
- **WHEN** an archetype or tier filter is applied
- **THEN** copy counts, averages and play rates are computed only over that filtered slice's decks

#### Scenario: Event filter active
- **WHEN** an event filter is applied
- **THEN** copy counts, averages and play rates are recomputed within that event's decks

#### Scenario: Event-size filter active
- **WHEN** an event-size class is selected
- **THEN** copy counts, averages and play rates are recomputed over only the decks of events in that size class

#### Scenario: Filters cleared
- **WHEN** all filters are cleared
- **THEN** the tables revert to the full format + time-frame slice

### Requirement: Top Sideboard Cards list

The dashboard SHALL display a "Top Sideboard Cards" table of the top 10 cards by **total copies** computed over `board='side'` only, showing rank, card name, average copies per deck running it in the sideboard (`Nx`, computed as for creatures), the total copy count, the play rate and the play-rate trend (all mono), under a header row matching the mainboard tables. It does NOT show a copy-share percentage. It SHALL respect the same slice (format, time frame, archetype/tier/event filters) as the mainboard tables, exclude lands, and show a localized empty state when the slice has no sideboard cards.

#### Scenario: Sideboard cards ranked
- **WHEN** the active slice has sideboard cards
- **THEN** the table shows a header row and the top 10 by total copies over `board='side'` with rank, card name, average copies as `Nx`, copy count, play rate and trend

#### Scenario: Sideboard average copies
- **WHEN** a sideboard card has 7 total copies across 3 decks that bring it
- **THEN** its average column shows `2x` (7 ÷ 3 = 2.33, rounded)

#### Scenario: Sideboard respects slice and time frame
- **WHEN** the user changes the time frame or applies a filter
- **THEN** the sideboard ranking and copy counts recompute for the same slice as the mainboard tables

#### Scenario: No sideboard cards
- **WHEN** the active slice has no sideboard cards
- **THEN** a localized empty state is shown

### Requirement: Top New Cards table

The dashboard SHALL display a "Top New Cards" / "Top Cartas Nuevas" table of the top 10 cards printed in either recent main set, ranked by total copies over mainboard and sideboard combined, with no subtitle. Each row SHALL show a zero-padded rank, the card name, the average copies per deck running it (`Nx`, over both boards), the total copy count, the play rate and the play-rate trend (all mono), plus a header row. It SHALL NOT show a set code or a copy-share percentage.

#### Scenario: Ranked by combined copies
- **WHEN** the active slice's decks play cards printed in `FRA` or `HOB`, in either board
- **THEN** the table lists the top 10 of them by total copies across both boards, each showing rank, name, average copies as `Nx`, copy count, play rate and trend

#### Scenario: Reprints and nonbasic lands appear
- **WHEN** a heavily played reprint in `FRA` and a nonbasic land from `HOB` are in the slice
- **THEN** both are eligible for the table, while basic lands never appear

#### Scenario: Average across both boards
- **WHEN** a recent-set card has 3 mainboard copies in one deck and 1 sideboard copy in another
- **THEN** its average column shows `2x` (4 copies ÷ 2 decks)

#### Scenario: Set-code chip
- **WHEN** a row's card is recorded with set code `HOB`
- **THEN** the row shows no set-code chip, and the header has no Set column, in both locales

#### Scenario: Localized title
- **WHEN** the UI language is English then Spanish
- **THEN** the title reads "Top New Cards" then "Top Cartas Nuevas", with no subtitle, while card names stay unchanged
