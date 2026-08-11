## ADDED Requirements

### Requirement: Trending tables count only legal decks

The trending tables (Creatures, Spells, Sideboard) SHALL be computed over the format's legal decks only. A deck holding a card banned in that format SHALL contribute nothing to any copy count, distinct-deck count, or average-copies-per-deck value — neither the banned card itself nor the legal cards played alongside it.

This SHALL hold in every combination with the existing filters: the legality exclusion applies first, and the archetype, tier, event, and event-size filters then narrow what remains.

A banned card SHALL therefore never appear in a trending table, since every deck that could have contributed it is excluded.

#### Scenario: Banned card is absent from the tables

- **WHEN** a card is banned in the selected format and decks in the window still contain it
- **THEN** it does not appear in the Trending Creatures, Trending Spells, or Top Sideboard Cards tables

#### Scenario: The rest of an illegal deck is excluded too

- **WHEN** a deck holding a banned card also contains legal cards
- **THEN** those legal cards receive no copies and no deck count from that deck, and its exclusion is visible in the averages

#### Scenario: Exclusion combines with the sidebar filters

- **WHEN** an archetype, tier, event, or event-size filter is active after a ban
- **THEN** the tables are computed over the legal decks within that filtered slice

#### Scenario: A format with no bans is unaffected

- **WHEN** the selected format's banlist matches nothing in the window
- **THEN** the tables show exactly what they would have shown without the exclusion
