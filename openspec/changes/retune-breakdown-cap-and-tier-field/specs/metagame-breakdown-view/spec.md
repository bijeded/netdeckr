## MODIFIED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL derive the metagame breakdown for the selected format and window from the decks stored in Supabase — grouping the window's decks by archetype and computing each archetype's share as its deck count divided by the total number of decks in that format+window — and, in the default (time-frame-only, unfiltered) view, display up to the top 12 archetypes, sorted by share (deck count) descending. Each archetype SHALL be shown as a card containing its rank (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, its signature-card art (a placeholder gradient when no art is available), and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`). Above the freshness line, the dashboard SHALL show a localized caption naming how many archetypes are shown (e.g. "Top 12 most popular archetypes", or the actual count when fewer than 12 exist). Because the breakdown is derived from the same decks shown in the drill-down, every displayed archetype SHALL have at least one deck.

#### Scenario: Breakdown renders for a format and window with decks
- **WHEN** the dashboard loads a format + window that has decks within its date range
- **THEN** its archetypes are shown as cards sorted by share (deck count) descending, each with rank, English name, mana pips, art, and its share percentage as one-decimal monospace text

#### Scenario: More than 12 archetypes are hard-cut in the default view
- **WHEN** a format + window's derived breakdown contains more than 12 archetypes and no event/archetype/tier filter is active
- **THEN** only the top 12 by share are displayed and the remainder are omitted, with no aggregated "Other" row, and the caption reads "Top 12 most popular archetypes"

#### Scenario: Fewer archetypes than the cap
- **WHEN** the default view contains 12 or fewer archetypes
- **THEN** all of them are displayed and the caption reflects the actual count (e.g. "Top 8 most popular archetypes")

#### Scenario: Every displayed archetype has decks
- **WHEN** an archetype card is displayed
- **THEN** it has at least one deck available in its drill-down — there are no cards with a share but no decks

### Requirement: Stable tier cutoffs via natural breaks
Tier boundaries SHALL be derived from the distribution of Last-2-Weeks Power Scores across a stable reference field — **the entire Last-2-Weeks corpus of archetypes (uncapped)**, independent of the grid's display cap — using natural breaks (Jenks) rather than fixed numeric thresholds or fixed percentiles, mapping the strongest cluster to T1 and successively weaker clusters to T2, T3, and the fringe tier. A displayed archetype's tier SHALL be determined by which break interval its Last-2-Weeks Power Score falls into, so the same archetype receives the same tier regardless of which window is selected. Cutoffs SHALL be recomputed as new data changes the reference field's spread. When fewer than four distinct Power Scores are present in the reference field, the available clusters SHALL be mapped starting from the top tier (T1) and the unused lower tiers simply do not appear.

#### Scenario: Cutoffs come from the field, not fixed thresholds
- **WHEN** the Last 2 Weeks field has a different spread of performance than a fixed 10/5/1 scheme would assume
- **THEN** the tier cutoffs adapt to that field's natural breaks rather than fixed thresholds, deterministically for the same inputs

#### Scenario: Reference field is the whole corpus, not the display slice
- **WHEN** an archetype outside the top 12 is displayed (via a filter)
- **THEN** it carries a tier badge computed against the whole 2-week corpus's natural breaks, on the same basis as archetypes within the top 12

#### Scenario: Small field maps from the top
- **WHEN** the reference field has fewer than four distinct Power Scores
- **THEN** clusters are assigned starting at T1 and the remaining lower tiers are absent, with no error

### Requirement: Archetype filter
The dashboard SHALL provide a sidebar filter group, headed "Archetype" (localized), that lets the user collapse the grid to a single archetype. The group SHALL offer an "All archetypes" default entry plus one entry per archetype present in the current filtered view — **uncapped**, so every archetype in the corpus (or every archetype within the selected event) is selectable, not only those shown in the top-12 grid. Selecting an archetype SHALL collapse the grid to show only that archetype's card, and SHALL auto-expand that card to list **all** of the archetype's decks under the combined active filters — not just the limited display set — each shown by event and date, in descending date order. The default state SHALL be "All archetypes". Archetype proper nouns SHALL stay in English in both locales; the heading and default entry SHALL be localized.

#### Scenario: Selecting an archetype isolates and auto-expands it
- **WHEN** the user selects a single archetype from the Archetype filter
- **THEN** the grid collapses to only that archetype's card, and that card is auto-expanded showing every deck of that archetype under the active format, time-frame, and event filter

#### Scenario: Dropdown lists every archetype, not only the top 12
- **WHEN** a format + window has more than 12 archetypes and no event filter is active
- **THEN** the Archetype dropdown offers every archetype in the corpus, including those below the top-12 grid cap

#### Scenario: All matching decks are shown in descending date order
- **WHEN** a single archetype is selected and its card is auto-expanded
- **THEN** all of the archetype's decks under the combined filters are listed by event and date, ordered most-recent first, without the display-count cap applied to the unfiltered grid

#### Scenario: All archetypes default shows the full grid
- **WHEN** the Archetype filter is set to "All archetypes"
- **THEN** the grid shows the default top-12 view (or the tier-filtered view when a tier is selected)

#### Scenario: Archetype filter with no matching decks shows an empty state
- **WHEN** the selected archetype has no decks under the combined active filters
- **THEN** a localized empty state is shown in place of the grid

### Requirement: Filters combine over the deck corpus
The dashboard SHALL apply the event, archetype, tier, and time-frame filters together as a logical AND over the active format's deck corpus, re-deriving the metagame breakdown from the resulting deck subset. Applying the filters SHALL NOT require any additional data fetch beyond the corpus already loaded for the active format.

#### Scenario: Event and archetype filters stack with the time frame
- **WHEN** an event, an archetype, and a non-default time-frame are all selected
- **THEN** the shown breakdown and decks reflect the intersection of all three within the active format

#### Scenario: Tier and event filters stack
- **WHEN** a tier and an event are both selected
- **THEN** the grid shows that tier's archetypes present in the event, with shares recomputed within the event

### Requirement: Auto-reset of invalid filter selections
When a selected event or archetype is no longer present after a change to the format, time-frame, or another filter, the dashboard SHALL silently reset that filter group to its "All" default rather than showing a stale selection or an error. (The Tier filter's four options are always selectable regardless of data, so it is never auto-reset for absence — a tier that matches no archetypes shows an empty state instead; see the Tier filter requirement. The Tier filter is only reset by the archetype-precedence rule and by "Clear filters".)

#### Scenario: Selected event disappears after switching format
- **WHEN** an event is selected and the user switches to a format or window in which that event does not exist
- **THEN** the Event filter silently resets to "All events" and the unrestricted breakdown for the new (format, window) is shown

#### Scenario: Selected archetype disappears after a filter change
- **WHEN** an archetype is selected and a format, window, or event change removes that archetype from the view
- **THEN** the Archetype filter silently resets to "All archetypes"

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL additionally provide a "Clear filters" control (localized) that resets the event, archetype, and tier filters to their "All" defaults at once. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event, archetype, and/or tier filter active
- **THEN** the event, archetype, and tier filters all reset to their "All" defaults and the default top-12 caption view returns

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event, archetype, and/or tier filter active
- **THEN** the filters return to their "All" defaults and the URL carries no filter param

## ADDED Requirements

### Requirement: Tier filter
The dashboard SHALL provide a sidebar filter group, headed "Tiers" (localized), placed after the Archetype filter, that lets the user restrict the grid to archetypes of a single performance tier. The group SHALL offer an "All tiers" default entry plus one entry per tier: Tier 1, Tier 2, Tier 3, and Rogue/Otros (localized labels), mapping to the existing T1/T2/T3/Otros tiers. Selecting a tier SHALL show **all** archetypes of that tier (uncapped) as normal collapsible cards — each click-to-expand for its decks, not auto-expanded — and SHALL hide the "Top N most popular archetypes" popularity caption (the view is no longer a popularity top-N). The tier grouping SHALL use the same whole-2-week-corpus tier assignment as the tier badges. The default state SHALL be "All tiers"; the heading, default entry, and tier labels SHALL be localized.

#### Scenario: Selecting a tier shows all its archetypes uncapped
- **WHEN** the user selects Tier 1 (or 2/3/Rogue-Otros) from the Tier filter
- **THEN** the grid shows every archetype assigned to that tier as a collapsible card, with no top-12 cap, and the popularity caption is hidden

#### Scenario: Tier cards are collapsible, not auto-expanded
- **WHEN** a tier is selected
- **THEN** each shown archetype card starts collapsed and expands its decks only on click

#### Scenario: Tier with no matching archetypes shows an empty state
- **WHEN** the selected tier matches no archetypes under the combined active filters
- **THEN** a localized empty state is shown in place of the grid

#### Scenario: Tier labels are localized
- **WHEN** the locale is switched
- **THEN** the "Tiers" heading, "All tiers" default, and the Rogue/Otros label switch language (Tier 1/2/3 numerals are shared)

### Requirement: Archetype filter takes precedence over the tier filter
When both an archetype and a tier are selected, the single-archetype isolation SHALL win: the grid SHALL isolate and auto-expand the chosen archetype's card. If the chosen archetype falls outside the selected tier, the Tier filter SHALL silently reset to "All tiers" (mirroring the invalid-selection auto-reset), so the view is never internally contradictory.

#### Scenario: Choosing an archetype outside the selected tier resets the tier
- **WHEN** a tier is active and the user selects an archetype that is not in that tier
- **THEN** the grid isolates and auto-expands that archetype's card and the Tier filter silently resets to "All tiers"

#### Scenario: Archetype within the selected tier stays isolated
- **WHEN** a tier is active and the user selects an archetype that is in that tier
- **THEN** the grid isolates and auto-expands that archetype's card
