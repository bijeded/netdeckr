# Spec Delta

## ADDED Requirements

### Requirement: How It Works explains the Analysis tab
The How It Works page SHALL include a section on the archetype Analysis tab, in English and Spanish and in the page's plain language. The section SHALL state the tab's fixed scope, then explain each part of the tab, naming each part as the tab labels it in that locale.

#### Scenario: Fixed scope is explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** the Analysis tab section says the tab always covers the last 2 weeks and all events, and that the sidebar's time frame, event, event size, and tier filters do not change it

#### Scenario: Each part of the tab is explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** the section has one entry each for the stock list, Power Score, the performance figures, the consensus bands, the sideboard plan, card types, Arena wildcards, and the small-sample label, each starting with that part's on-screen name

#### Scenario: Stock list and Power Score are explained
- **WHEN** the reader looks up the stock list and Power Score
- **THEN** the stock list entry says cards are ranked by how many decks play them, weighted so deeper finishes at bigger events count more, and placed at their most common copy count; and the Power Score entry says it is the performance score behind the Tier

#### Scenario: Bands and wildcards are explained
- **WHEN** the reader looks up the consensus bands and Arena wildcards
- **THEN** the bands entry gives the Core (90% or more of decks), Flex (25% or more), and Spicy (under 25%) thresholds, and the wildcards entry says it applies to Standard and Pioneer only, excludes basic lands, and is an approximation based on each card's printed rarity

#### Scenario: Small sample is explained
- **WHEN** the reader looks up the small-sample label
- **THEN** its entry says it appears when the archetype has fewer than 5 decks and that those numbers should be read loosely

#### Scenario: Both locales keep the same structure
- **WHEN** the English and Spanish How It Works pages are compared
- **THEN** they have the same sequence of section types, including the Analysis tab section
