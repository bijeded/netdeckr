# archetype-decklists-view

## Purpose
The frontend behavior for exploring an archetype's real recent decklists: expanding an archetype card in the metagame breakdown into its recent decks, viewing a full decklist (mainboard/sideboard) in a modal, and exporting that decklist to MTG Arena — all localized in Spanish and English.
## Requirements
### Requirement: Expand an archetype to its recent decklists
The system SHALL allow the user to expand an archetype in the metagame breakdown to reveal a list of that archetype's decklists for the currently selected format and time window. When the archetype has decks that finished 1st, 2nd, or Top 4 (placings 1, 2, and 3–4), the expanded list SHALL show up to its 4 most recent such top-finishing decks (by event date, most recent first). When the archetype has no such top-finishing decks, the expanded list SHALL instead show its latest 4 decklists by event date (most recent first) as a fallback. Each deck row SHALL display the deck's placing/result, the player name, the event name and date, and the archetype's color-identity pips. Only archetypes that have at least one stored decklist for the current `(format, window)` SHALL present an expand affordance.

#### Scenario: Expand an archetype with top-finishing decklists
- **WHEN** a format and time window are selected and the user clicks an archetype card that has at least one 1st, 2nd, or Top 4 decklist for that format and window
- **THEN** the card expands to show deck rows for those top finishes, each displaying placing/result, player name, event name and date, and the archetype's color pips

#### Scenario: Fall back to the latest 4 lists when there are no top finishes
- **WHEN** an archetype has stored decklists for the current format and window but none finished 1st, 2nd, or Top 4
- **THEN** the card expands to show its latest 4 decklists by event date (most recent first)

#### Scenario: Archetype with no decklists is not expandable
- **WHEN** an archetype has zero stored decklists for the current format and window
- **THEN** the archetype card presents no expand affordance and cannot be expanded

#### Scenario: Collapse an expanded archetype
- **WHEN** an archetype card is expanded and the user collapses it
- **THEN** the card returns to its collapsed grid state

#### Scenario: Deck rows follow the active filters
- **WHEN** an archetype is expanded and the user changes the format or time window
- **THEN** the deck rows update to decks matching the new format and window, or the card collapses if none exist for the new selection

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

### Requirement: Export a decklist to MTG Arena
The system SHALL provide an export action in the decklist modal that produces the deck in MTG Arena text format — an optional `About` block naming the deck (`Name <archetype>`), followed by a `Deck` section and a `Sideboard` section with one `"<quantity> <card name>"` line per card. Card lines SHALL use each card's Scryfall canonical English name with its current non-foil set and collector number when that mapping is present, and SHALL fall back to the card's scraped name otherwise, without failing the export. (Scryfall mapping is populated by a separate change; until then all cards use the scraped-name fallback.) For Arena-supported formats (Standard, Pioneer) the export SHALL copy the text to the clipboard and confirm; for the other formats (Modern, Pauper, Pre-Modern) the export SHALL download the text as a `.txt` file. The export action's label SHALL reflect its delivery — an Arena-export label for the clipboard formats and a download label for the file formats.

#### Scenario: Copy a Standard or Pioneer deck to the clipboard
- **WHEN** the decklist modal is open for a Standard or Pioneer deck and the user triggers the export action
- **THEN** the deck is copied to the clipboard in Arena text format (an `About`/`Name` block, then Deck / Sideboard sections, one `"<quantity> <card name>"` line per card, using the Scryfall canonical name and current non-foil set + collector number when present and the scraped name otherwise) and a localized confirmation is shown

#### Scenario: Download a Modern, Pauper, or Pre-Modern deck as a file
- **WHEN** the decklist modal is open for a Modern, Pauper, or Pre-Modern deck and the user triggers the export action
- **THEN** the export produces a `.txt` file containing the naming block and the mainboard and sideboard in the same line format, instead of copying to the clipboard

#### Scenario: Card without a Scryfall mapping falls back to its scraped name
- **WHEN** a decklist contains a card whose Scryfall mapping is absent and the user exports the deck
- **THEN** the export succeeds and that card appears using its scraped name

#### Scenario: Export delivery and label are chosen by format
- **WHEN** the decklist modal renders its export action
- **THEN** the action is clipboard copy with an Arena-export label for Standard and Pioneer decks, and file download with a download label for Modern, Pauper, and Pre-Modern decks

#### Scenario: Export failure is surfaced
- **WHEN** the export cannot complete (the clipboard write is rejected, or the file download cannot be produced)
- **THEN** a localized error message is shown and the modal remains usable

### Requirement: Localized decklist UI
All user-facing text introduced by the decklist view — deck-row labels, modal headings, the mainboard card-type section headings (Lands, Creatures, Spells, Other), the list/image view control's label and accessible name, export action, and confirmations — SHALL be provided through react-i18next in both Spanish and English, with MTG proper nouns (card and archetype names) left in English in both locales. Card quantity indicators in image view are numeric and SHALL NOT require translation.

#### Scenario: Decklist UI in both locales
- **WHEN** the user views the expanded archetype, decklist modal (including the mainboard card-type section headings and the list/image view control), and export action in either the Spanish or the English locale
- **THEN** all interface labels appear in the active locale while card and archetype names remain in English

### Requirement: Decklist modal offers an image view
The decklist modal SHALL offer a second rendering mode in which the mainboard and sideboard
are presented as grids of card images instead of text lines. Each distinct card SHALL occupy
exactly one tile regardless of how many copies the deck runs, and each tile SHALL carry a
quantity indicator showing that card's copy count. The quantity indicator SHALL be rendered
on its own opaque backdrop so it is never read directly against card art. Card images SHALL
be hotlinked from Scryfall's CDN at a thumbnail size appropriate to the tile, and SHALL be
lazy-loaded so opening the modal in list view fetches no tile images.

Tiles SHALL be the same size in the mainboard and in the sideboard. The number of tiles per
row SHALL adapt to the available width so that neither board overflows its container
horizontally on any viewport.

#### Scenario: Mainboard and sideboard render as image grids
- **WHEN** the decklist modal is in image view with a loaded decklist
- **THEN** the mainboard and sideboard each render as a grid of card image tiles, one tile per distinct card, and both boards' tiles are the same size

#### Scenario: Each tile shows its copy count
- **WHEN** a decklist contains four copies of a card and the modal is in image view
- **THEN** that card occupies a single tile bearing a quantity indicator of 4, shown on its own backdrop rather than directly over the art

#### Scenario: Card totals are preserved in image view
- **WHEN** the decklist modal is in image view
- **THEN** the mainboard and sideboard section headings show the same card totals as in list view

#### Scenario: Image grid fits narrow viewports
- **WHEN** the decklist modal is in image view on a narrow (mobile) viewport
- **THEN** the tiles reflow to fit the available width and neither board scrolls horizontally

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

### Requirement: Switch between decklist list view and image view
The decklist modal SHALL provide a control that switches between list view and image view,
positioned before the export action. The control SHALL indicate the view it switches **to**:
a grid indicator while the list is showing, and a list indicator while images are showing.
It SHALL carry a visible text label on wide viewports and SHALL be reduced to its indicator
alone on narrow viewports, where it SHALL still expose an accessible name describing the
action. Switching views SHALL NOT re-fetch the decklist or affect the export action.

The modal SHALL open in list view every time it is opened. The selected view SHALL NOT
persist across decks, across modal closes, or across sessions.

#### Scenario: Switch to image view and back
- **WHEN** the user activates the view control while the decklist modal shows the list view
- **THEN** the mainboard and sideboard re-render as image grids and the control now indicates a switch back to the list

#### Scenario: Control is icon-only on narrow viewports
- **WHEN** the decklist modal is open on a narrow (mobile) viewport
- **THEN** the view control shows only its indicator, without a visible text label, and still exposes an accessible name stating which view it switches to

#### Scenario: View resets on every open
- **WHEN** the user switches to image view, closes the modal, and opens a decklist again (the same deck or another)
- **THEN** the modal shows the list view

#### Scenario: Switching views does not disturb the decklist
- **WHEN** the user switches views on a loaded decklist
- **THEN** no additional decklist request is made and the export action produces the same output in either view

### Requirement: Cards without art show a placeholder tile
In image view a card whose Scryfall image is unavailable — either unresolved or an image that
fails to load — SHALL render as a placeholder tile bearing the card's name and its quantity
indicator, occupying the same space as any other tile. A missing image SHALL NOT remove the
card from the grid or alter the board's card total.

#### Scenario: Unresolved card renders a placeholder tile
- **WHEN** the mainboard in image view contains a card with no resolved Scryfall image
- **THEN** a placeholder tile bearing that card's name and quantity appears in the grid and the mainboard total is unchanged

#### Scenario: Failed image load falls back to the placeholder
- **WHEN** a tile's card image fails to load
- **THEN** that tile falls back to the placeholder treatment rather than leaving an empty space

