## MODIFIED Requirements

### Requirement: View a full decklist in a modal
The system SHALL open a modal displaying the full decklist when the user selects a deck row. The modal SHALL present the mainboard and sideboard as separate sections, each listing card quantities and names. The mainboard SHALL be grouped by card type into four fixed-order sections — **Lands**, **Creatures**, **Spells**, **Other** — each with its own summed card count; a section heading SHALL appear only when that section contains at least one card. The sideboard SHALL remain a single flat list. The modal SHALL be dismissible and SHALL remain legible on narrow (mobile) viewports.

A card SHALL be classified by its Scryfall type line using this precedence: a type line containing "Land" is a **Land** (so a Land Creature such as Dryad Arbor is a Land); otherwise a type line containing "Creature" is a **Creature** (so an Artifact Creature or Enchantment Creature is a Creature); otherwise a type line containing Instant, Sorcery, or Enchantment is a **Spell**; every other card — including a card whose type line is missing (an unresolved Scryfall mapping) — is **Other**. The grouping SHALL be display-only and SHALL NOT alter the MTG Arena export output.

#### Scenario: Open the decklist modal
- **WHEN** the user clicks a deck row in an expanded archetype
- **THEN** a modal opens showing the deck's mainboard (grouped by card type) and sideboard as separate sections with card quantities and names

#### Scenario: Mainboard grouped by card type
- **WHEN** the decklist modal renders a loaded mainboard
- **THEN** cards appear under the section headings Lands, Creatures, Spells, and Other in that order, each showing its summed card count, and each card is placed by the type-line precedence (Land, then Creature, then Instant/Sorcery/Enchantment, then Other)

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

### Requirement: Localized decklist UI
All user-facing text introduced by the decklist view — deck-row labels, modal headings, the mainboard card-type section headings (Lands, Creatures, Spells, Other), export action, and confirmations — SHALL be provided through react-i18next in both Spanish and English, with MTG proper nouns (card and archetype names) left in English in both locales.

#### Scenario: Decklist UI in both locales
- **WHEN** the user views the expanded archetype, decklist modal (including the mainboard card-type section headings), and export action in either the Spanish or the English locale
- **THEN** all interface labels appear in the active locale while card and archetype names remain in English
