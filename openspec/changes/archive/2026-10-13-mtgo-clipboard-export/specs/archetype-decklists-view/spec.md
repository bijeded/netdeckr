# Spec Delta

## ADDED Requirements

### Requirement: Export a decklist to its client via the clipboard
The decklist modal SHALL provide an export action that copies the deck to the clipboard as text for the client its format is played on: MTG Arena for Standard and Pioneer, Magic Online (MTGO) for Modern, Pauper, and Pre-Modern. No format SHALL download a file. The action's label SHALL name that client, and a successful copy SHALL show the same localized confirmation for both clients.

#### Scenario: Standard or Pioneer copies Arena text
- **WHEN** the decklist modal is open for a Standard or Pioneer deck and the user triggers the export action
- **THEN** the deck is copied to the clipboard as MTG Arena text and a localized confirmation is shown

#### Scenario: Modern, Pauper, or Pre-Modern copies MTGO text
- **WHEN** the decklist modal is open for a Modern, Pauper, or Pre-Modern deck and the user triggers the export action
- **THEN** the deck is copied to the clipboard as MTGO text and the same localized confirmation is shown
- **AND** no file is downloaded

#### Scenario: Export label is chosen by format
- **WHEN** the decklist modal renders its export action
- **THEN** it is labeled as an MTG Arena export for Standard and Pioneer decks and as an MTGO export for Modern, Pauper, and Pre-Modern decks

#### Scenario: Export failure is surfaced
- **WHEN** the export cannot complete because the clipboard write is rejected
- **THEN** a localized error message is shown and the modal remains usable

### Requirement: Arena export text
The MTG Arena export text SHALL be an optional `About` block naming the deck (`Name <archetype>`), followed by a `Deck` section and a `Sideboard` section with one `"<quantity> <card name>"` line per card. A card line SHALL use the card's Scryfall canonical English name with its current non-foil set and collector number when that mapping is present, and SHALL fall back to the card's scraped name otherwise, without failing the export.

#### Scenario: Arena text layout
- **WHEN** an Arena export is produced for a deck with a sideboard
- **THEN** the text is an `About`/`Name` block, then a `Deck` section, then a `Sideboard` section, one `"<quantity> <card name>"` line per card, each using the Scryfall canonical name and current non-foil set + collector number when present

#### Scenario: Arena card without a Scryfall mapping falls back to its scraped name
- **WHEN** an Arena export includes a card whose Scryfall mapping is absent
- **THEN** the export succeeds and that card's line uses its scraped name

### Requirement: MTGO export text layout
The MTGO export text SHALL contain only card lines: one `"<quantity> <card name>"` line per mainboard card, then — only when the deck has a sideboard — exactly one empty line followed by one line per sideboard card. It SHALL contain no deck-name block, no section headers, and no set codes or collector numbers, and its lines SHALL be separated by CRLF.

#### Scenario: MTGO text layout
- **WHEN** an MTGO export is produced for a deck with a sideboard
- **THEN** the text is the mainboard card lines, one empty line, then the sideboard card lines, separated by CRLF, with no `About`/`Name` block, no `Deck` or `Sideboard` header, and no set code or collector number on any line

#### Scenario: MTGO export of a deck without a sideboard
- **WHEN** an MTGO export is produced for a deck with no sideboard cards
- **THEN** the text contains only the mainboard card lines, with no trailing empty line

### Requirement: MTGO card naming
MTGO export card names SHALL follow MTGO's naming: a double-faced, modal double-faced, or adventure card SHALL be written by its front face name only; a split card SHALL be written as its two halves joined by a single `/` with no surrounding spaces; every other card SHALL be written by its Scryfall canonical English name. A card without a Scryfall mapping SHALL fall back to its scraped name under the same rules, without failing the export.

#### Scenario: Double-faced card is written by its front face
- **WHEN** an MTGO export includes a card whose canonical name is `Ajani, Nacatl Pariah // Ajani, Nacatl Avenger`
- **THEN** its line reads `<quantity> Ajani, Nacatl Pariah`

#### Scenario: Split card is written with an unspaced slash
- **WHEN** an MTGO export includes a split card whose canonical name is `Wear // Tear`
- **THEN** its line reads `<quantity> Wear/Tear`

#### Scenario: Single-face card is written by its canonical name
- **WHEN** an MTGO export includes a single-face card such as `Ragavan, Nimble Pilferer`
- **THEN** its line reads `<quantity> Ragavan, Nimble Pilferer`

#### Scenario: MTGO card without a Scryfall mapping falls back to its scraped name
- **WHEN** an MTGO export includes a card whose Scryfall mapping is absent
- **THEN** the export succeeds and that card's line uses its scraped name, with a split card's halves joined by an unspaced `/`

## REMOVED Requirements

### Requirement: Export a decklist to MTG Arena
**Reason**: Its Modern/Pauper/Pre-Modern behavior — a `.txt` download in Arena syntax — is replaced by an MTGO-syntax clipboard copy. The requirement is split into four smaller ones so each states one behavior.
**Migration**: Covered by "Export a decklist to its client via the clipboard", "Arena export text", "MTGO export text layout", and "MTGO card naming". Standard and Pioneer behavior is unchanged; Modern, Pauper, and Pre-Modern users paste the copied list into MTGO instead of downloading a file.
