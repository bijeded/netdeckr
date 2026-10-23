# Spec Delta

## ADDED Requirements

### Requirement: Grid sort order
The grid caption row SHALL offer a localized sort control, beside the main-window "Reset" control, with exactly two options: Popularity and Power. Popularity, the default, orders archetypes by share as specified by "Display the archetype breakdown". Power orders them by performance as specified by "Power order ranking". The control SHALL show which option is active, be operable by keyboard with a visible focus indicator, and stay visible on narrow viewports without opening the sidebar.

#### Scenario: Popularity is the default order
- **WHEN** the dashboard loads with no sort param in the URL
- **THEN** the sort control shows Popularity as active and the grid is ordered by share descending

#### Scenario: Switching to Power reorders the grid
- **WHEN** the user selects Power in the sort control
- **THEN** the grid is re-derived in the Power order, with no further request to the database

#### Scenario: Switching back to Popularity restores the share order
- **WHEN** the Power order is active and the user selects Popularity
- **THEN** the grid returns to the share-descending order and the popularity caption

#### Scenario: Sort control is reachable on mobile
- **WHEN** the viewport is narrow and the sidebar is collapsed
- **THEN** the sort control is visible on the caption row alongside "Reset"

#### Scenario: Sort control labels are localized
- **WHEN** the dashboard is displayed in Spanish or English
- **THEN** the sort control's option labels and accessible name are shown in that language

### Requirement: Power order ranking
Under the Power order the grid SHALL rank the archetypes of the current view by tier (T1, then T2, then T3, then the fringe tier), then by Last-2-Weeks Power Score descending within a tier, then by share descending, then by name ascending. It SHALL use the same Power Score and tier that set each card's tier badge, whatever window is selected, and SHALL only rank archetypes present in the current window and filters. The Power Score number SHALL NOT be shown on the grid.

#### Scenario: Higher tiers come first
- **WHEN** the Power order is active and the view contains T1, T2, and T3 archetypes
- **THEN** every T1 card precedes every T2 card, and every T2 card precedes every T3 card

#### Scenario: A demoted high scorer stays in its badge's tier
- **WHEN** the Power order is active and an archetype is shown as T2 because it is below the Tier 1 minimum-deck floor, although its Power Score is higher than a T1 archetype's
- **THEN** it is placed among the T2 cards, after every T1 card

#### Scenario: Order within a tier follows the Power Score
- **WHEN** the Power order is active and two archetypes share a tier
- **THEN** the one with the higher Last-2-Weeks Power Score is placed first

#### Scenario: Ties fall back to share, then name
- **WHEN** the Power order is active and two archetypes share a tier and an equal Power Score
- **THEN** the one with the higher share is placed first, and archetypes equal on share are ordered by name ascending

#### Scenario: Order matches the badges on the 7-day window
- **WHEN** the Last 7 Days window is selected and the Power order is active
- **THEN** the order is derived from the same Last-2-Weeks scores and tiers that the cards' tier badges show

#### Scenario: Archetypes absent from the window are not ranked
- **WHEN** an archetype has decks in the Last 2 Weeks but none in the selected Last 7 Days window
- **THEN** it does not appear in the Power order

#### Scenario: No Power Score number on the grid
- **WHEN** the Power order is active
- **THEN** no archetype card shows its Power Score as a number, and each card's share percentage and share bar still show its metagame share

### Requirement: Power order cap and caption
In the default (time-frame-only, unfiltered) view, the Power order SHALL select the top 12 archetypes from every archetype in the window, ranked by "Power order ranking", rather than reordering the 12 most popular. Its caption SHALL read "Top 12 most powerful archetypes" (localized), or the actual count when fewer than 12 exist. Narrowed views keep their existing caps and captions; under the Power order their archetypes are shown in Power order.

#### Scenario: A rarely played strong archetype enters the top 12
- **WHEN** the default view has more than 12 archetypes, the Power order is active, and an archetype ranked below 12th by share ranks within the top 12 by Power order
- **THEN** that archetype is displayed, and the archetype it displaces is omitted

#### Scenario: Power caption in the default view
- **WHEN** the default view has more than 12 archetypes and the Power order is active
- **THEN** exactly 12 cards are shown and the caption reads "Top 12 most powerful archetypes"

#### Scenario: Fewer archetypes than the cap under Power
- **WHEN** the default view has 12 or fewer archetypes and the Power order is active
- **THEN** all of them are shown and the caption names the actual count (e.g. "Top 8 most powerful archetypes")

#### Scenario: Tier filter under Power
- **WHEN** a tier filter is active and the Power order is active
- **THEN** the grid shows that tier's archetypes ordered by Power Score, and the caption is the tier caption it shows under the popularity order

#### Scenario: Event or size filter under Power
- **WHEN** an event or event-size filter is active and the Power order is active
- **THEN** every archetype of that narrowed view is shown, uncapped, in Power order, and the caption is the event or size caption it shows under the popularity order

### Requirement: Sort control disabled while an archetype is isolated
While an archetype is isolated, the sort control SHALL remain rendered in place but SHALL be disabled and SHALL NOT be activatable, so that isolating and leaving an archetype does not shift the caption row. The active sort order SHALL be kept and SHALL apply again when the isolation ends.

#### Scenario: Isolating an archetype disables the control
- **WHEN** the user isolates an archetype
- **THEN** the sort control is still shown on the caption row but is disabled

#### Scenario: Leaving isolation restores the order
- **WHEN** the Power order is active, an archetype is isolated, and the user leaves the isolated view
- **THEN** the grid returns in the Power order and the sort control is enabled again

### Requirement: Sort order persisted in the URL
The Power order SHALL be persisted in the URL as `sort=power` alongside the other params, and the Popularity order SHALL be represented by the absence of the param. A link carrying `sort=power` SHALL open the grid in the Power order. An unknown `sort` value SHALL be removed silently and Popularity applied. Changing the order SHALL NOT add a history entry. The order SHALL be kept across format and window switches.

#### Scenario: Power link restores the order
- **WHEN** the user loads a URL carrying `sort=power`
- **THEN** the grid is shown in the Power order once data loads, with Power active in the sort control

#### Scenario: Popularity leaves no param
- **WHEN** the user selects Popularity
- **THEN** the URL carries no `sort` param

#### Scenario: Unknown sort value is ignored
- **WHEN** the user loads a URL carrying an unknown `sort` value
- **THEN** the param is removed from the URL and the Popularity order is applied, with no error

#### Scenario: Changing the order adds no history entry
- **WHEN** the user switches between Popularity and Power
- **THEN** the browser's Back action does not step back through those switches

#### Scenario: Order survives a format switch
- **WHEN** the Power order is active and the user switches to a different format or window
- **THEN** the new breakdown is shown in the Power order and `sort=power` remains in the URL

### Requirement: Sort order is independent of filters
The sort order SHALL be a view preference, not a filter. "Clear filters" and the main-window "Reset" SHALL NOT change it, selecting Power SHALL NOT enable "Reset", and the order SHALL be kept when any filter changes.

#### Scenario: Reset keeps the order
- **WHEN** the Power order is active with a filter applied and the user activates "Reset" or "Clear filters"
- **THEN** the filters reset and the grid is shown in the Power order

#### Scenario: Power alone does not enable Reset
- **WHEN** no filter is active and the user selects Power
- **THEN** the main-window "Reset" control remains disabled

#### Scenario: Order kept across filter changes
- **WHEN** the Power order is active and the user selects or clears an event, event-size, archetype, or tier filter
- **THEN** the Power order remains active

## MODIFIED Requirements

### Requirement: Display the archetype breakdown
The dashboard SHALL derive the metagame breakdown for the selected format and window from the decks stored in Supabase — grouping the window's decks by archetype and computing each archetype's share as its deck count divided by the total number of decks in that format+window — and, in the default (time-frame-only, unfiltered) view, display up to the top 12 archetypes in the active grid sort order (see "Grid sort order"), which defaults to share (deck count) descending. Each archetype SHALL be shown as a card containing its rank — its position in the active sort order (zero-padded, e.g. `01`), its archetype name in English, its color-identity mana pips, its signature-card art (a placeholder gradient when no art is available), and its share percentage rendered in a monospace font with exactly one decimal (e.g. `14.2%`). Above the freshness line, the dashboard SHALL show a localized caption naming how many archetypes are shown and in which order (e.g. "Top 12 most popular archetypes" under the popularity order, "Top 12 most powerful archetypes" under the Power order, or the actual count when fewer than 12 exist). Because the breakdown is derived from the same decks shown in the drill-down, every displayed archetype SHALL have at least one deck.

The decks the breakdown is derived from SHALL be the format's **legal** decks only: a deck holding a card banned in that format is excluded from the corpus before the breakdown, its shares, and its performance figures are derived. Consequently the share denominator counts legal decks only, an archetype with no legal deck in the window does not appear at all, and an archetype with both keeps only its legal decks in its share, its rank, and its drill-down.

#### Scenario: Breakdown renders for a format and window with decks
- **WHEN** the dashboard loads a format + window that has decks within its date range, with the popularity order active
- **THEN** its archetypes are shown as cards sorted by share (deck count) descending, each with rank, English name, mana pips, art, and its share percentage as one-decimal monospace text

#### Scenario: More than 12 archetypes are hard-cut in the default view
- **WHEN** a format + window's derived breakdown contains more than 12 archetypes, no event, event-size, archetype, or tier filter is active, and the popularity order is active
- **THEN** only the top 12 by share are displayed and the remainder are omitted, with no aggregated "Other" row, and the caption reads "Top 12 most popular archetypes"

#### Scenario: Fewer archetypes than the cap
- **WHEN** the default view contains 12 or fewer archetypes and the popularity order is active
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

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event-size, event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Enabled, it SHALL read as an available action and SHALL be clearly distinguishable from its disabled state, which SHALL recede rather than compete with the caption beside it. Both controls SHALL have identical effect. The event-size, event, and tier selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL. The archetype selection is the one exception: it SHALL be persisted in the URL as specified by "Isolated archetype persisted in the URL", and clearing it SHALL remove that param. The enabled treatment SHALL be visually distinct from the dashboard's data indicators: it SHALL NOT reuse the share-delta trend colors, so that the control is never mistaken for a metric by the archetype cards below it. The disabled treatment SHALL remain neutral — carrying no accent hue at all — rather than being a faded variant of the enabled one.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the event-size, event, archetype, and tier filters all reset to their "All" defaults and the unfiltered top-12 view returns in the active sort order

#### Scenario: Main-window reset resets all groups
- **WHEN** the user activates the main-window "Reset" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the filters reset exactly as the sidebar's "Clear filters" control does, and the caption returns to the unfiltered caption of the active sort order

#### Scenario: Reset is disabled when nothing is filtered
- **WHEN** no event-size, event, archetype, or tier filter is active
- **THEN** the main-window "Reset" control is still rendered in place but is disabled and cannot be activated

#### Scenario: A size selection alone enables Reset
- **WHEN** the only active filter is an event-size class
- **THEN** both the sidebar "Clear filters" and the main-window "Reset" controls are enabled

#### Scenario: The enabled Reset stands out from the disabled one
- **WHEN** a filter is applied and the "Reset" control becomes enabled
- **THEN** it is visibly emphasized as an available action, distinct from the muted treatment it carries while disabled

#### Scenario: Reset is reachable on mobile
- **WHEN** the viewport is narrow and the sidebar is collapsed
- **THEN** the main-window "Reset" control is visible on the caption row without opening the sidebar

#### Scenario: Non-archetype filters do not persist across reloads
- **WHEN** the user reloads the page with an event-size, event, and/or tier filter active
- **THEN** those filters return to their "All" defaults and the URL carries no event-size, event, or tier param

#### Scenario: The isolated archetype persists across reloads
- **WHEN** the user reloads the page with an archetype isolated
- **THEN** the same archetype is isolated after reload, while any event-size, event, or tier filter that was active returns to its "All" default

#### Scenario: Clearing removes the archetype param
- **WHEN** an archetype is isolated and the user activates "Clear filters" or "Reset"
- **THEN** the `?a=` param is removed from the URL along with the in-memory filters being reset

#### Scenario: The enabled Reset does not read as a metric
- **WHEN** a filter is applied and the "Reset" control is enabled while the grid below shows archetype cards carrying rising/falling share-delta indicators
- **THEN** the control's accent is not the share-delta trend colors, and it remains distinguishable from those indicators

#### Scenario: The enabled Reset separates from the caption beside it
- **WHEN** a filter is applied and the "Reset" control is enabled on the grid caption row
- **THEN** its accent differs from the caption text's own accent, so the two do not read as one block

#### Scenario: The disabled Reset carries no accent hue
- **WHEN** no filter is active and the "Reset" control is disabled
- **THEN** it is rendered in the neutral muted treatment with no accent hue, not as a faded version of the enabled control's accent
