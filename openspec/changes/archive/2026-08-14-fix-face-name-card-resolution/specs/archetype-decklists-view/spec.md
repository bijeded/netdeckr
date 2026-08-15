## MODIFIED Requirements

### Requirement: View a full decklist in a modal
The system SHALL open a modal displaying the full decklist when the user selects a deck row. The modal SHALL present the mainboard and sideboard as separate sections, each listing card quantities and names. The mainboard SHALL be grouped by card type into four fixed-order sections — **Lands**, **Creatures**, **Spells**, **Other** — each with its own summed card count; a section heading SHALL appear only when that section contains at least one card. The sideboard SHALL remain a single flat list. The modal SHALL be dismissible and SHALL remain legible on narrow (mobile) viewports.

A card SHALL be classified by its Scryfall type line using this precedence: a type line containing "Land" is a **Land** (so a Land Creature such as Dryad Arbor is a Land); otherwise a type line containing "Creature" is a **Creature** (so an Artifact Creature or Enchantment Creature is a Creature); otherwise a type line containing Instant, Sorcery, or Enchantment is a **Spell**; every other card — including a card whose type line is missing (an unresolved Scryfall mapping) — is **Other**. The type line under test describes the single face the deck plays, never a multi-face card's combined line, so this precedence applies within one face: a card is a Land only when the face it is played as is a land, and a modal double-faced card played as a sorcery is therefore a Spell. The grouping SHALL be display-only and SHALL NOT alter the MTG Arena export output.

#### Scenario: Open the decklist modal
- **WHEN** the user clicks a deck row in an expanded archetype
- **THEN** a modal opens showing the deck's mainboard (grouped by card type) and sideboard as separate sections with card quantities and names

#### Scenario: Mainboard grouped by card type
- **WHEN** the decklist modal renders a loaded mainboard
- **THEN** cards appear under the section headings Lands, Creatures, Spells, and Other in that order, each showing its summed card count, and each card is placed by the type-line precedence (Land, then Creature, then Instant/Sorcery/Enchantment, then Other)

#### Scenario: Land Creature is still a Land
- **WHEN** a mainboard card's played face is a Land Creature such as Dryad Arbor
- **THEN** it appears under the Lands section

#### Scenario: A modal double-faced land-spell groups by its played face
- **WHEN** a mainboard card's played face is a sorcery and its other face is a land
- **THEN** it appears under the Spells section rather than the Lands section

#### Scenario: Unresolved card type falls into Other
- **WHEN** a mainboard card has no resolved Scryfall type line
- **THEN** the card appears under the Other section and is included in the mainboard total (nothing is hidden)

#### Scenario: Empty type sections are hidden
- **WHEN** a card-type section contains no cards (for example a mainboard with no creatures)
- **THEN** that section's heading is not rendered

#### Scenario: Sideboard and export are unaffected by grouping
- **WHEN** the decklist modal is open
- **THEN** the sideboard is shown as a single flat list and the MTG Arena export produces the same output as before the grouping

#### Scenario: Dismiss the decklist modal
- **WHEN** the decklist modal is open and the user presses Escape, clicks the close control, or clicks the backdrop
- **THEN** the modal closes and focus returns to the deck row that opened it

#### Scenario: Modal is legible on mobile
- **WHEN** the decklist modal is open on a narrow viewport
- **THEN** the mainboard and sideboard remain legible and scrollable within the modal

### Requirement: Mainboard image view is a flat grid ordered with lands last
In image view the mainboard SHALL be rendered as a single flat grid with no card-type
section headings. Cards SHALL be ordered **Creatures**, then **Spells**, then **Other**, then
**Lands**, using the same type-line classification as the list view — including its
single-face basis, so a card sorts by the face the deck plays. The transition between
one type and the next SHALL NOT begin a new row: tiles flow continuously so that lands
continue whichever row the preceding cards ended on. The list view's card-type grouping and
its Lands-first section order SHALL remain unchanged.

#### Scenario: Mainboard image grid is flat and ends with lands
- **WHEN** the decklist modal renders a loaded mainboard in image view
- **THEN** no card-type headings appear, and tiles run in the order creatures, spells, other, lands

#### Scenario: Type transitions do not break the grid
- **WHEN** the mainboard's non-land cards do not exactly fill a row in image view
- **THEN** the first land tile continues that same partly-filled row rather than starting a new one

#### Scenario: Image view sorts a multi-face card by its played face
- **WHEN** a mainboard card's played face is a sorcery and its other face is a land
- **THEN** its tile sorts with the spells rather than with the trailing lands

#### Scenario: List view grouping is unaffected
- **WHEN** the user returns the modal to list view
- **THEN** the mainboard is again grouped under the Lands, Creatures, Spells, and Other headings in that order
