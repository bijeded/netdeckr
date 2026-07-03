## MODIFIED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL derive the metagame breakdown for the selected format and window from the decks stored in Supabase — grouping the window's decks by archetype and computing each archetype's share as its deck count divided by the total number of decks in that format+window — and display up to the top 20 archetypes, sorted by share (deck count) descending. Each archetype SHALL be shown as a card containing its rank (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, its signature-card art (a placeholder gradient when no art is available), and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`). Because the breakdown is derived from the same decks shown in the drill-down, every displayed archetype SHALL have at least one deck.

#### Scenario: Breakdown renders for a format and window with decks
- **WHEN** the dashboard loads a format + window that has decks within its date range
- **THEN** its archetypes are shown as cards sorted by share (deck count) descending, each with rank, English name, mana pips, art, and its share percentage as one-decimal monospace text

#### Scenario: More than 20 archetypes are hard-cut
- **WHEN** a format + window's derived breakdown contains more than 20 archetypes
- **THEN** only the top 20 by share are displayed and the remainder are omitted, with no aggregated "Other" row

#### Scenario: Every displayed archetype has decks
- **WHEN** an archetype card is displayed
- **THEN** it has at least one deck available in its drill-down — there are no cards with a share but no decks

### Requirement: Time-frame filter
The dashboard SHALL provide a sidebar selector, headed "Time Frame" (localized), that lets the user choose the metagame time window from exactly two options — Last 5 Days, Last 2 Weeks. These are format-independent logical keys (`5days`, `2weeks`) that select a **date range** over the format's decks (Last 2 Weeks contains Last 5 Days). Selecting a window SHALL update the displayed breakdown to the metagame derived from that format's decks whose event date falls within the window. The selected window SHALL be preserved when the active format is switched. All selector labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a different window updates the breakdown
- **WHEN** the user selects a window different from the current one for a format that has decks in it
- **THEN** the archetype grid, ranks, shares, and freshness indicator update to the breakdown derived from that format's decks within the window's date range

#### Scenario: Window is preserved across format switches
- **WHEN** the user has a non-default window selected and switches the active format
- **THEN** the same window remains selected and the new format's derived breakdown for that window is shown

#### Scenario: Only the two supported windows are offered
- **WHEN** the time-frame selector renders
- **THEN** exactly two options are shown — Last 5 Days and Last 2 Weeks — and no Last 2 Months option is present

#### Scenario: Selector labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the two window options and the "Time Frame" heading render their labels in that language

### Requirement: Data freshness indicator
The dashboard SHALL display an "Updated X ago" indicator reflecting the selected format's last-updated timestamp (`formats.last_updated_at`, stamped per format by the scraper). Freshness SHALL be per-format, not per-window. When the format has no last-updated timestamp, the indicator SHALL be omitted without error.

#### Scenario: Freshness reflects the format's last update
- **WHEN** a format's derived breakdown is displayed and the format has a last-updated timestamp
- **THEN** an "Updated X ago" indicator shows the elapsed time since that timestamp

#### Scenario: Missing timestamp hides the indicator
- **WHEN** the selected format has no last-updated timestamp
- **THEN** no freshness indicator is shown and the dashboard renders without error
