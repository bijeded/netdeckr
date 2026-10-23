# Spec Delta

## MODIFIED Requirements

### Requirement: Small-sample label
When the archetype has fewer than 5 analysed decks, the stock list and curve SHALL still render, each carrying a localized label that the sample is small.

#### Scenario: Four decks show the label
- **WHEN** the archetype has 4 decks in the 2-week corpus
- **THEN** the stock list and composition sections render with a small-sample label

#### Scenario: Five decks show no label
- **WHEN** the archetype has 5 decks in the 2-week corpus
- **THEN** no small-sample label is shown

### Requirement: Localized analysis UI
All user-facing text on the Analysis tab — section headings, labels, notes, chart axes and tooltips, export action, and confirmations — SHALL be provided through react-i18next in Spanish and English, with card and archetype names left in English in both locales.

#### Scenario: Analysis in both locales
- **WHEN** the user views the Analysis tab in Spanish or English
- **THEN** every interface label appears in the active locale while card and archetype names remain in English

## REMOVED Requirements

### Requirement: Consensus card table
**Reason**: Users report it repeats what the dashboard's Top Creatures and Top Spells tables already show for the isolated archetype (play rate and average copies per card), so it adds length to the tab without new information.
**Migration**: Isolate the archetype and read Top Creatures and Top Spells for mainboard play rates and average copies. The stock list still shows which cards the archetype's consensus build plays.

### Requirement: Card tables are paged
**Reason**: The only tables it applied to, the consensus table and the sideboard plan, are removed.
**Migration**: None; no remaining Analysis tab table is paged.

### Requirement: Sideboard plan
**Reason**: Users report it repeats what the dashboard's Top Sideboard Cards table already shows for the isolated archetype.
**Migration**: Isolate the archetype and read Top Sideboard Cards for sideboard play rates and average copies. The stock list's sideboard still shows the consensus sideboard.
