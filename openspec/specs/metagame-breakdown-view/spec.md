# metagame-breakdown-view

## Purpose
The dashboard that derives a format and time-window's metagame breakdown from the decks stored in Supabase and renders the ranked top-20 archetype grid, including format and time-frame selection/persistence (in a filter sidebar), the per-format freshness indicator, loading/empty/error states, and bilingual (ES/EN) copy.

## Requirements

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

### Requirement: Color-identity mana pips
Each archetype card SHALL display mana pips representing its WUBRG color identity: one pip per color (up to five). An archetype with no color identity (colorless) SHALL display exactly one gray pip.

#### Scenario: Multi-color archetype
- **WHEN** an archetype has a color identity of two or more colors
- **THEN** one mana pip per color is shown, in WUBRG order, up to five pips

#### Scenario: Colorless archetype
- **WHEN** an archetype has no color identity
- **THEN** a single gray pip is shown

### Requirement: Default format selection
The dashboard SHALL default to the Standard format when no format is specified, and SHALL support the five formats Standard, Pioneer, Modern, Pauper, and Pre-Modern.

#### Scenario: First visit defaults to Standard
- **WHEN** the dashboard is opened with no format specified in the URL
- **THEN** Standard is selected and its breakdown is shown

### Requirement: Switch the active format
The dashboard SHALL let the user switch between the five formats, updating the displayed breakdown to the newly selected format.

#### Scenario: Selecting a different format updates the breakdown
- **WHEN** the user selects a format different from the current one
- **THEN** the displayed breakdown updates to that format's top-20 archetypes

### Requirement: Persist the selected format across reloads
The dashboard SHALL persist the selected format in the URL (e.g. `?f=ST`) so that reloading the page restores the same format.

#### Scenario: Reload preserves the format
- **WHEN** the user has selected a non-default format and reloads the page
- **THEN** the same format remains selected and its breakdown is shown

#### Scenario: URL format is applied on load
- **WHEN** the dashboard is opened with a valid format code in the URL
- **THEN** that format is selected and its breakdown is shown

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

### Requirement: Default window selection
The dashboard SHALL default to the Last 5 Days (`5days`) window when no window is specified.

#### Scenario: First visit defaults to Last 5 Days
- **WHEN** the dashboard is opened with no window specified in the URL
- **THEN** the Last 5 Days window is selected and its breakdown is shown

### Requirement: Persist the selected window across reloads
The dashboard SHALL persist the selected window in the URL alongside the format (e.g. `?f=ST&w=2weeks`) so that reloading or sharing the link restores the same window. An absent, invalid, or unknown window param — including the retired `2months` value — SHALL fall back to the default Last 5 Days window without error.

#### Scenario: Reload preserves the window
- **WHEN** the user has selected a non-default window and reloads the page
- **THEN** the same window remains selected and its breakdown is shown

#### Scenario: URL window is applied on load
- **WHEN** the dashboard is opened with a valid window param in the URL
- **THEN** that window is selected and the matching breakdown is shown

#### Scenario: Invalid or retired window param falls back to default
- **WHEN** the dashboard is opened with an absent, invalid, unknown, or retired (`2months`) window param
- **THEN** the Last 5 Days window is selected without error

### Requirement: Data freshness indicator
The dashboard SHALL display an "Updated X ago" indicator reflecting the selected format's last-updated timestamp (`formats.last_updated_at`, stamped per format by the scraper). Freshness SHALL be per-format, not per-window. When the format has no last-updated timestamp, the indicator SHALL be omitted without error.

#### Scenario: Freshness reflects the format's last update
- **WHEN** a format's derived breakdown is displayed and the format has a last-updated timestamp
- **THEN** an "Updated X ago" indicator shows the elapsed time since that timestamp

#### Scenario: Missing timestamp hides the indicator
- **WHEN** the selected format has no last-updated timestamp
- **THEN** no freshness indicator is shown and the dashboard renders without error

### Requirement: Loading, empty, and error states
While the decks query is in flight the dashboard SHALL show a spinner in the main window. When the selected format and window have no decks (so the derived breakdown is empty), or the read fails, the dashboard SHALL show a centered friendly message with a frowny face in the main window instead of cards.

#### Scenario: Loading spinner while fetching
- **WHEN** the breakdown query for the selected format + window is in progress and has not yet returned
- **THEN** a spinner is displayed in the main window

#### Scenario: Empty state when no data
- **WHEN** the selected format + window has no decks (the derived breakdown is empty)
- **THEN** a centered friendly message with a frowny face is shown in the main window instead of cards

#### Scenario: Error state on read failure
- **WHEN** the Supabase read for the selected format + window fails
- **THEN** the same centered friendly frowny-face state is shown rather than a broken screen

### Requirement: Bilingual UI copy
All user-facing copy introduced by the breakdown view SHALL be localized in both Spanish and English via react-i18next, with no hardcoded strings; MTG proper nouns (archetype names) SHALL remain in English in both locales.

#### Scenario: Copy switches with locale
- **WHEN** the active locale is Spanish or English
- **THEN** labels and state messages render in that language while archetype names stay in English

### Requirement: Performance-based tier badge
Each displayed archetype card SHALL show a tier badge (T1, T2, T3, or the fringe tier) assigned from the archetype's **Power Score** — a measure of how well the archetype performs, derived from the final standings (placements) of its decks — computed over the **Last 2 Weeks corpus** and NOT from its metagame share. The badge SHALL be stable across the time-frame toggle: switching between Last 5 Days and Last 2 Weeks SHALL NOT change an archetype's tier badge. The Power Score itself SHALL NOT be shown as a numeric value; it SHALL surface only through the tier badge. Assigning tiers from Power Score SHALL NOT alter the metagame-share value, its one-decimal display, its bar, the ranking, or the top-20 cap defined by the "Display the archetype breakdown" requirement, all of which continue to reflect the selected window.

#### Scenario: Badge reflects performance, not popularity
- **WHEN** two archetypes have equal metagame share but different placement records over the Last 2 Weeks
- **THEN** the archetype whose decks finish deeper (better standings) receives a tier at least as high as the other, and its share number and bar are still displayed unchanged

#### Scenario: A high-share, low-performing archetype is not top-tier by popularity alone
- **WHEN** an archetype has a large metagame share but its decks mostly finish in the lower brackets over the Last 2 Weeks
- **THEN** its tier badge reflects that weaker performance and is not forced to T1 by share alone

#### Scenario: A low-share, strong-performing archetype can rank high
- **WHEN** a displayed archetype has a small metagame share but its decks consistently finish in the top brackets across enough decks over the Last 2 Weeks
- **THEN** it can be assigned a high tier (T1 or T2) despite its low share

#### Scenario: Badge is stable across the window toggle
- **WHEN** the user switches between the Last 5 Days and Last 2 Weeks windows
- **THEN** a given archetype's tier badge does not change, because it is always computed from the Last 2 Weeks corpus

#### Scenario: Raw Power Score is not displayed
- **WHEN** an archetype card renders
- **THEN** no raw Power Score number is shown — only the tier badge conveys the archetype's performance level

### Requirement: Placement-derived Power Score inputs
The Power Score SHALL be computed only from each deck's final-standing bracket (e.g. `1`, `2`, `3-4`, `5-8`, `9-16`), mapping better standings to higher finish quality, and SHALL depend on how deep the archetype's decks finish rather than on how many decks it has. Increasing an archetype's number of decks without improving their standings SHALL NOT by itself raise its Power Score above a rival with fewer but deeper-finishing decks.

#### Scenario: Deeper finishes score higher
- **WHEN** an archetype's decks are shifted to better standings (e.g. more 1st/2nd, fewer 9-16)
- **THEN** its Power Score does not decrease

#### Scenario: Volume without depth does not win
- **WHEN** archetype A appears many times but always in a low bracket, and archetype B appears fewer times but consistently in top brackets
- **THEN** B's Power Score is not lower than A's on account of A's larger deck count alone

### Requirement: Small-sample statistical adjustment without a hard floor
The Power Score SHALL apply a statistical lower-bound adjustment (a Wilson-style shrink) so that an archetype supported by few decks is pulled toward the low end in proportion to its uncertainty, and a strong record supported by more decks is trusted more. There SHALL NOT be a hard minimum-deck cutoff that forces low-count archetypes to the fringe tier regardless of results; the adjustment alone governs small samples.

#### Scenario: A single lucky win does not reach the top tier
- **WHEN** an archetype is represented by exactly one deck that placed 1st over the Last 2 Weeks
- **THEN** its Power Score is materially reduced by the uncertainty adjustment so it is not assigned T1 on that single result

#### Scenario: A strong record over enough decks is trusted
- **WHEN** an archetype has many decks that consistently finish in top brackets
- **THEN** the uncertainty adjustment leaves its Power Score high enough to earn a high tier

### Requirement: Stable tier cutoffs via natural breaks
Tier boundaries SHALL be derived from the distribution of Last-2-Weeks Power Scores across a stable reference field (the Last 2 Weeks top archetypes) using natural breaks (Jenks) rather than fixed numeric thresholds or fixed percentiles, mapping the strongest cluster to T1 and successively weaker clusters to T2, T3, and the fringe tier. A displayed archetype's tier SHALL be determined by which break interval its Last-2-Weeks Power Score falls into, so the same archetype receives the same tier regardless of which window is selected. Cutoffs SHALL be recomputed as new data changes the reference field's spread. When fewer than four distinct Power Scores are present in the reference field, the available clusters SHALL be mapped starting from the top tier (T1) and the unused lower tiers simply do not appear.

#### Scenario: Cutoffs come from the field, not fixed thresholds
- **WHEN** the Last 2 Weeks field has a different spread of performance than a fixed 10/5/1 scheme would assume
- **THEN** the tier cutoffs adapt to that field's natural breaks rather than fixed thresholds, deterministically for the same inputs

#### Scenario: Small field maps from the top
- **WHEN** the reference field has fewer than four distinct Power Scores
- **THEN** clusters are assigned starting at T1 and the remaining lower tiers are absent, with no error

### Requirement: Recent-window performance trend
On a window other than the Last 2 Weeks baseline (i.e. Last 5 Days), each displayed archetype card SHALL show a trend indicator (an up ▲, down ▼, or flat – arrow) reflecting how the archetype's performance in the selected window compares to its **Last 2 Weeks** baseline — computed from the selected window's decks only, using the underlying finish-quality (not the small-sample-shrunken score, so the indicator reflects a real change in performance and not merely a smaller sample). The indicator SHALL show ▲ when the selected window's performance is above the baseline beyond a small deadband, ▼ when below it beyond the deadband, and – (flat) otherwise — including when the archetype has fewer than a minimum number of usable placements in the selected window, so that a single recent result cannot swing the arrow. When the selected window IS the Last 2 Weeks baseline, NO trend indicator SHALL be shown (there is nothing to compare against); making the baseline view's trend meaningful (a week-over-week comparison) is out of scope for this change. The indicator SHALL NOT display a raw Power Score or numeric delta; it SHALL convey direction only (glyph + semantic color) and SHALL carry a localized accessible label (Spanish/English).

#### Scenario: Recent over-performance shows an up arrow
- **WHEN** the Last 5 Days window is selected and an archetype with at least the minimum recent decks has a recent finish quality above its Last 2 Weeks baseline beyond the deadband
- **THEN** its card shows an up ▲ indicator (rising), while its tier badge remains the stable Last-2-Weeks tier

#### Scenario: Recent under-performance shows a down arrow
- **WHEN** the Last 5 Days window is selected and an archetype with at least the minimum recent decks has a recent finish quality below its Last 2 Weeks baseline beyond the deadband
- **THEN** its card shows a down ▼ indicator (falling)

#### Scenario: Baseline window shows no indicator
- **WHEN** the Last 2 Weeks window is selected
- **THEN** no trend indicator is shown on any card, because the selected window is the baseline

#### Scenario: Too few recent decks shows a flat indicator
- **WHEN** the Last 5 Days window is selected and a displayed archetype has fewer than the minimum number of usable recent placements (including none)
- **THEN** its trend indicator is flat (–) rather than a direction driven by one or two results

#### Scenario: Trend indicator is localized and shows no number
- **WHEN** the active locale is Spanish or English and a trend indicator renders
- **THEN** it shows only a direction glyph with its semantic color and a localized accessible label, and displays no raw Power Score or numeric delta

### Requirement: Fringe and missing-data tier behavior
An archetype that has no usable placement data in the Last 2 Weeks (its decks carry no parseable standing) SHALL be assigned the lowest, fringe tier rather than causing an error or a blank badge. The fringe tier label SHALL remain localized (English "Rogue" / Spanish "Otros") while T1, T2, and T3 remain universal. An empty window (no decks) SHALL continue to be handled by the existing empty/loading/error states, with no archetype cards and therefore no badges, and no new empty state is introduced.

#### Scenario: Archetype with no usable placements
- **WHEN** a displayed archetype's Last-2-Weeks decks have no parseable final standing
- **THEN** it is assigned the fringe tier (Rogue/Otros) and its badge renders without error

#### Scenario: Fringe label stays localized
- **WHEN** the active locale is Spanish or English and a fringe-tier badge renders
- **THEN** it reads "Otros" in Spanish and "Rogue" in English, while T1/T2/T3 read identically in both

#### Scenario: Empty window uses existing states
- **WHEN** the selected format+window has no decks
- **THEN** the existing empty/loading/error handling applies and no tier badges are shown

### Requirement: Legible card indicators over art
The archetype card SHALL keep its overlaid indicators — the tier badge, the color-identity mana pips, and the recent-window trend arrow — readable regardless of the brightness or busyness of the signature-card art behind them.

#### Scenario: Vignette darkens the badge corners
- **WHEN** an archetype card renders its signature-card art
- **THEN** a non-interactive overlay darkens the art toward its edges and corners while leaving the center near-transparent, so the art stays visible but the corner indicators have a legible backdrop

#### Scenario: Overlay does not intercept interaction
- **WHEN** the user clicks anywhere on the card art region
- **THEN** the vignette overlay does not intercept the click, and the card's expand/collapse behavior is unchanged

#### Scenario: Tier badge and trend arrow are self-lit
- **WHEN** the tier badge or trend arrow renders over the art
- **THEN** each carries a glow in its own color (tier hue for the badge, up/down/flat color for the trend arrow) so it reads as legible even against art of a similar tone

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window), each labelled with the event name and its abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next, with MTG proper nouns kept in English in both locales.

#### Scenario: Selecting an event narrows the breakdown
- **WHEN** the user selects a single event from the Event filter
- **THEN** the archetype grid, ranks, shares, and freshness derive from only that event's decks within the active format and time-frame

#### Scenario: Percentages reflect share within the selected event
- **WHEN** an event is selected
- **THEN** each archetype card's percentage equals that archetype's deck count in the event divided by the event's total decks (summing to 100% across the event), not its share of the full window

#### Scenario: Event list reflects the current format and window
- **WHEN** the Event filter group renders for a given format and time-frame
- **THEN** it lists exactly the events whose decks fall within that (format, window), each shown by name and abbreviated date, plus the "All events" default

#### Scenario: All events default shows the full breakdown
- **WHEN** the Event filter is set to "All events"
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction

#### Scenario: Expanding a card under an event filter shows all its decks
- **WHEN** an event is selected and the user expands an archetype card
- **THEN** every one of that archetype's decks in the event is shown (the broad-view display cap is not applied), ordered best finish first

### Requirement: Archetype filter
The dashboard SHALL provide a sidebar filter group, headed "Archetype" (localized), that lets the user collapse the grid to a single archetype. The group SHALL offer an "All archetypes" default entry plus one entry per archetype present in the current filtered view. Selecting an archetype SHALL collapse the grid to show only that archetype's card, and SHALL auto-expand that card to list **all** of the archetype's decks under the combined active filters — not just the limited display set — each shown by event and date, in descending date order. The default state SHALL be "All archetypes". Archetype proper nouns SHALL stay in English in both locales; the heading and default entry SHALL be localized.

#### Scenario: Selecting an archetype isolates and auto-expands it
- **WHEN** the user selects a single archetype from the Archetype filter
- **THEN** the grid collapses to only that archetype's card, and that card is auto-expanded showing every deck of that archetype under the active format, time-frame, and event filter

#### Scenario: All matching decks are shown in descending date order
- **WHEN** a single archetype is selected and its card is auto-expanded
- **THEN** all of the archetype's decks under the combined filters are listed by event and date, ordered most-recent first, without the display-count cap applied to the unfiltered grid

#### Scenario: All archetypes default shows the full grid
- **WHEN** the Archetype filter is set to "All archetypes"
- **THEN** the grid shows every archetype in the active filtered view

#### Scenario: Archetype filter with no matching decks shows an empty state
- **WHEN** the selected archetype has no decks under the combined active filters
- **THEN** a localized empty state is shown in place of the grid

### Requirement: Filters combine over the deck corpus
The dashboard SHALL apply the event, archetype, and time-frame filters together as a logical AND over the active format's deck corpus, re-deriving the metagame breakdown from the resulting deck subset. Applying the filters SHALL NOT require any additional data fetch beyond the corpus already loaded for the active format.

#### Scenario: Event and archetype filters stack with the time frame
- **WHEN** an event, an archetype, and a non-default time-frame are all selected
- **THEN** the shown breakdown and decks reflect the intersection of all three within the active format

### Requirement: Auto-reset of invalid filter selections
When a selected event or archetype is no longer present after a change to the format, time-frame, or another filter, the dashboard SHALL silently reset that filter group to its "All" default rather than showing a stale selection or an error.

#### Scenario: Selected event disappears after switching format
- **WHEN** an event is selected and the user switches to a format or window in which that event does not exist
- **THEN** the Event filter silently resets to "All events" and the unrestricted breakdown for the new (format, window) is shown

#### Scenario: Selected archetype disappears after a filter change
- **WHEN** an archetype is selected and a format, window, or event change removes that archetype from the view
- **THEN** the Archetype filter silently resets to "All archetypes"

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL additionally provide a "Clear filters" control (localized) that resets the event and archetype filters to their "All" defaults at once. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event and/or archetype filter active
- **THEN** both the event and archetype filters reset to their "All" defaults

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event and/or archetype filter active
- **THEN** the event and archetype filters return to their "All" defaults and the URL carries no event or archetype param
