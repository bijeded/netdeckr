# Spec Delta

## MODIFIED Requirements

### Requirement: Mana curve and card-type split
The Analysis tab SHALL show the stock list mainboard's mana curve (non-land card counts by mana value, with the highest bucket open-ended) and its split by card type into lands, creatures, planeswalkers, battles, artifacts, enchantments, instants, and sorceries, plus "other" for a card whose type line is unresolved. This split SHALL NOT change the decklist type grouping used to group the stock list.

#### Scenario: Curve excludes lands
- **WHEN** the stock list mainboard has 24 lands and 36 non-land cards
- **THEN** the curve sums to 36 and the type split shows 24 lands

#### Scenario: High mana values share a bucket
- **WHEN** the stock list includes cards with mana values 6, 7, and 9
- **THEN** they are counted in one open-ended top bucket

#### Scenario: Each card type is shown separately
- **WHEN** the stock list mainboard has 22 lands, 14 creatures, 2 planeswalkers, 4 artifacts, 4 enchantments, 8 instants, and 6 sorceries
- **THEN** the type split shows each of those counts under its own type, sums to 60, and shows no battles and no other

#### Scenario: Multi-type cards count once by precedence
- **WHEN** the mainboard includes a Land Creature, an Artifact Creature, an Enchantment Land, an Artifact Enchantment, and a Kindred Sorcery
- **THEN** they are counted as a land, a creature, a land, an artifact, and a sorcery respectively

#### Scenario: Unresolved type line falls into other
- **WHEN** a mainboard card has no resolved type line
- **THEN** it is counted under other

#### Scenario: Stock list grouping is unchanged
- **WHEN** the stock list mainboard contains artifacts, enchantments, instants, and sorceries
- **THEN** the stock list itself still groups them under the decklist's Lands, Creatures, Spells, and Other sections, while the type split shows them by card type

## ADDED Requirements

### Requirement: Card-type split counts each card once by precedence
Each card in the Analysis tab's card-type split SHALL count once, under the first of its played face's types in the order Land, Creature, Planeswalker, Battle, Artifact, Enchantment, Instant, Sorcery, so the split sums to the mainboard size.

#### Scenario: Split total matches the mainboard
- **WHEN** a 60-card stock list mainboard includes multi-type cards such as an Artifact Creature and an Enchantment Land
- **THEN** the card-type split sums to 60

#### Scenario: Earlier type wins
- **WHEN** a card's played face is an Enchantment Creature
- **THEN** it is counted under creatures and not under enchantments

### Requirement: Card-type split leaves out empty types
A card type with no cards in the stock list mainboard SHALL be left out of the Analysis tab's card-type split.

#### Scenario: Absent types are not shown
- **WHEN** the stock list mainboard has no battles and no card with an unresolved type line
- **THEN** neither battles nor other appear in the card-type split or its legend
