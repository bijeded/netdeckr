## MODIFIED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL derive the metagame breakdown for the selected format and window from the decks stored in Supabase — grouping the window's decks by archetype and computing each archetype's share as its deck count divided by the total number of decks in that format+window — and, in the default (time-frame-only, unfiltered) view, display up to the top 12 archetypes, sorted by share (deck count) descending. Each archetype SHALL be shown as a card containing its rank (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, its signature-card art (a placeholder gradient when no art is available), and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`). Above the freshness line, the dashboard SHALL show a localized caption naming how many archetypes are shown (e.g. "Top 12 most popular archetypes", or the actual count when fewer than 12 exist). Because the breakdown is derived from the same decks shown in the drill-down, every displayed archetype SHALL have at least one deck.

The decks the breakdown is derived from SHALL be the format's **legal** decks only: a deck holding a card banned in that format is excluded from the corpus before the breakdown, its shares, and its performance figures are derived. Consequently the share denominator counts legal decks only, an archetype with no legal deck in the window does not appear at all, and an archetype with both keeps only its legal decks in its share, its rank, and its drill-down.

#### Scenario: Breakdown renders for a format and window with decks
- **WHEN** the dashboard loads a format + window that has decks within its date range
- **THEN** its archetypes are shown as cards sorted by share (deck count) descending, each with rank, English name, mana pips, art, and its share percentage as one-decimal monospace text

#### Scenario: More than 12 archetypes are hard-cut in the default view
- **WHEN** a format + window's derived breakdown contains more than 12 archetypes and no event, event-size, archetype, or tier filter is active
- **THEN** only the top 12 by share are displayed and the remainder are omitted, with no aggregated "Other" row, and the caption reads "Top 12 most popular archetypes"

#### Scenario: Fewer archetypes than the cap
- **WHEN** the default view contains 12 or fewer archetypes
- **THEN** all of them are displayed and the caption reflects the actual count (e.g. "Top 8 most popular archetypes")

#### Scenario: Every displayed archetype has decks
- **WHEN** an archetype card is displayed
- **THEN** it has at least one deck available in its drill-down — there are no cards with a share but no decks

#### Scenario: Illegal decks are absent from the breakdown
- **WHEN** the window's decks include decks holding a card banned in that format
- **THEN** those decks are excluded before the breakdown is derived, so they appear in no archetype's share, rank, deck count, or drill-down

#### Scenario: An archetype with only illegal decks is not displayed
- **WHEN** every deck of an archetype in the window holds a card banned in that format
- **THEN** the archetype is absent from the grid entirely, and the caption's count reflects the archetypes actually shown
