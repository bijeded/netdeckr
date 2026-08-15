## ADDED Requirements

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
**Lands**, using the same type-line classification as the list view. The transition between
one type and the next SHALL NOT begin a new row: tiles flow continuously so that lands
continue whichever row the preceding cards ended on. The list view's card-type grouping and
its Lands-first section order SHALL remain unchanged.

#### Scenario: Mainboard image grid is flat and ends with lands
- **WHEN** the decklist modal renders a loaded mainboard in image view
- **THEN** no card-type headings appear, and tiles run in the order creatures, spells, other, lands

#### Scenario: Type transitions do not break the grid
- **WHEN** the mainboard's non-land cards do not exactly fill a row in image view
- **THEN** the first land tile continues that same partly-filled row rather than starting a new one

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

## MODIFIED Requirements

### Requirement: Localized decklist UI
All user-facing text introduced by the decklist view — deck-row labels, modal headings, the mainboard card-type section headings (Lands, Creatures, Spells, Other), the list/image view control's label and accessible name, export action, and confirmations — SHALL be provided through react-i18next in both Spanish and English, with MTG proper nouns (card and archetype names) left in English in both locales. Card quantity indicators in image view are numeric and SHALL NOT require translation.

#### Scenario: Decklist UI in both locales
- **WHEN** the user views the expanded archetype, decklist modal (including the mainboard card-type section headings and the list/image view control), and export action in either the Spanish or the English locale
- **THEN** all interface labels appear in the active locale while card and archetype names remain in English
