## MODIFIED Requirements

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
