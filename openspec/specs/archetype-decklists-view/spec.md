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

### Requirement: View a full decklist in a modal
The system SHALL open a modal displaying the full decklist when the user selects a deck row. The modal SHALL present the mainboard and sideboard as separate sections, each listing card quantities and names. The modal SHALL be dismissible and SHALL remain legible on narrow (mobile) viewports.

#### Scenario: Open the decklist modal
- **WHEN** the user clicks a deck row in an expanded archetype
- **THEN** a modal opens showing the deck's mainboard and sideboard as separate sections with card quantities and names

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
All user-facing text introduced by the decklist view — deck-row labels, modal headings, export action, and confirmations — SHALL be provided through react-i18next in both Spanish and English, with MTG proper nouns (card and archetype names) left in English in both locales.

#### Scenario: Decklist UI in both locales
- **WHEN** the user views the expanded archetype, decklist modal, and export action in either the Spanish or the English locale
- **THEN** all interface labels appear in the active locale while card and archetype names remain in English
