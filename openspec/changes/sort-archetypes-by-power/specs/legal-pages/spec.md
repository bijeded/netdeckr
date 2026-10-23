# Spec Delta

## MODIFIED Requirements

### Requirement: How It Works content

The How It Works page SHALL explain, in plain, direct language (not condescending, not aimed below the reader), how Netdeckr processes information: that it periodically reads publicly available tournament results from MTGTop8 and publicly available card data from Scryfall, and turns that into the metagame view shown on the dashboard. It SHALL explain, in accessible terms, what each dashboard data point means — the Events/Archetypes/Decks stat cards, metagame share, share delta, the Tier classification (including a one-sentence explanation of how Tier is decided, distinct from popularity), the tier trend arrow, the grid's Popularity and Power sort orders (including a one-sentence explanation that Power orders archetypes by tier and then by how well they perform, not by how often they are played), the Top Creatures/Top Spells/Top Sideboard Cards/Top New Cards tables, and each value those tables show per card: Avg (average copies in the decks that run it), Copies (total copies across the decks in view), Decks (the share of decks in view that run it) and Trend (how that share changed versus the previous period of the same length). It SHALL state that Netdeckr has no user accounts and does not collect anything personal from visitors, with an inline link on the words "Privacy Policy" that navigates to the Privacy Policy page. It SHALL credit DMM Studios as the site's developer, with the link applied only to the words "DMM Studios" (not the surrounding sentence). It SHALL include a Scryfall data/image credit line, without a cross-reference to the footer notice.

#### Scenario: Plain-language data explanation
- **WHEN** the How It Works page is displayed
- **THEN** it explains, in plain and respectful (not childish) language, that Netdeckr reads public tournament and card data and turns it into the dashboard's metagame view, and that it has no accounts and collects nothing personal from visitors

#### Scenario: Dashboard data points explained
- **WHEN** the How It Works page is displayed
- **THEN** it explains what the stat cards, metagame share, share delta, Tier (including how Tier is decided in one sentence), the tier trend arrow, the Popularity and Power sort orders, and the Top Creatures/Top Spells/Top Sideboard Cards/Top New Cards tables each mean

#### Scenario: Trending table values explained
- **WHEN** the How It Works page is displayed in English or Spanish
- **THEN** it explains what Avg, Copies, Decks and Trend mean in the trending tables, notes that the tables are ranked by Copies, and does not mention a set code on Top New Cards

#### Scenario: Inline link to the Privacy Policy
- **WHEN** the How It Works page is displayed
- **THEN** the words "Privacy Policy" within the "what we know about you" section are a link that navigates to the Privacy Policy page, without a full page reload

#### Scenario: DMM Studios and Stackeados credit
- **WHEN** the How It Works page is displayed
- **THEN** it credits DMM Studios as the site's developer (link applied only to the words "DMM Studios", linking to https://studiosdmm.com.mx/) and Stackeados, a Mexican Spanish-language Magic: The Gathering podcast, as who the site was built for (link applied only to the word "Stackeados", linking to https://www.youtube.com/@stackeados)

#### Scenario: Scryfall credit
- **WHEN** the How It Works page is displayed
- **THEN** it includes a credit line for card images and data sourced via Scryfall
