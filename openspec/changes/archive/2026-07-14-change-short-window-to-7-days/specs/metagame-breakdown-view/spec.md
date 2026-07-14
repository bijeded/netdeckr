## MODIFIED Requirements

### Requirement: Time-frame filter
The dashboard SHALL provide a sidebar selector, headed "Time Frame" (localized), that lets the user choose the metagame time window from exactly two options — Last 7 Days, Last 2 Weeks. These are format-independent logical keys (`7days`, `2weeks`) that select a **date range** over the format's decks (Last 2 Weeks contains Last 7 Days). Selecting a window SHALL update the displayed breakdown to the metagame derived from that format's decks whose event date falls within the window. The selected window SHALL be preserved when the active format is switched. All selector labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a different window updates the breakdown
- **WHEN** the user selects a window different from the current one for a format that has decks in it
- **THEN** the archetype grid, ranks, shares, and freshness indicator update to the breakdown derived from that format's decks within the window's date range

#### Scenario: Window is preserved across format switches
- **WHEN** the user has a non-default window selected and switches the active format
- **THEN** the same window remains selected and the new format's derived breakdown for that window is shown

#### Scenario: Only the two supported windows are offered
- **WHEN** the time-frame selector renders
- **THEN** exactly two options are shown — Last 7 Days and Last 2 Weeks — and no Last 2 Months option is present

#### Scenario: Selector labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the two window options and the "Time Frame" heading render their labels in that language

### Requirement: Default window selection
The dashboard SHALL default to the Last 7 Days (`7days`) window when no window is specified.

#### Scenario: First visit defaults to Last 7 Days
- **WHEN** the dashboard is opened with no window specified in the URL
- **THEN** the Last 7 Days window is selected and its breakdown is shown

### Requirement: Persist the selected window across reloads
The dashboard SHALL persist the selected window in the URL alongside the format (e.g. `?f=ST&w=2weeks`) so that reloading or sharing the link restores the same window. An absent, invalid, or unknown window param — including the retired `5days` and `2months` values — SHALL fall back to the default Last 7 Days window without error.

#### Scenario: Reload preserves the window
- **WHEN** the user has selected a non-default window and reloads the page
- **THEN** the same window remains selected and its breakdown is shown

#### Scenario: URL window is applied on load
- **WHEN** the dashboard is opened with a valid window param in the URL
- **THEN** that window is selected and the matching breakdown is shown

#### Scenario: Invalid or retired window param falls back to default
- **WHEN** the dashboard is opened with an absent, invalid, unknown, or retired (`5days` or `2months`) window param
- **THEN** the Last 7 Days window is selected without error

### Requirement: Performance-based tier badge
Each displayed archetype card SHALL show a tier badge (T1, T2, T3, or the fringe tier) assigned from the archetype's **Power Score** — a measure of how well the archetype performs, derived from the final standings (placements) of its decks — computed over the **Last 2 Weeks corpus** and NOT from its metagame share. The badge SHALL be stable across the time-frame toggle: switching between Last 7 Days and Last 2 Weeks SHALL NOT change an archetype's tier badge. The Power Score itself SHALL NOT be shown as a numeric value; it SHALL surface only through the tier badge. Assigning tiers from Power Score SHALL NOT alter the metagame-share value, its one-decimal display, its bar, the ranking, or the top-20 cap defined by the "Display the archetype breakdown" requirement, all of which continue to reflect the selected window.

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
- **WHEN** the user switches between the Last 7 Days and Last 2 Weeks windows
- **THEN** a given archetype's tier badge does not change, because it is always computed from the Last 2 Weeks corpus

### Requirement: Recent-window performance trend
On a window other than the Last 2 Weeks baseline (i.e. Last 7 Days), each displayed archetype card SHALL show a trend indicator (an up ▲, down ▼, or flat – arrow) reflecting how the archetype's performance in the selected window compares to its **Last 2 Weeks** baseline — computed from the selected window's decks only, using the underlying finish-quality (not the small-sample-shrunken score, so the indicator reflects a real change in performance and not merely a smaller sample). The indicator SHALL show ▲ when the selected window's performance is above the baseline beyond a small deadband, ▼ when below it beyond the deadband, and – (flat) otherwise — including when the archetype has fewer than a minimum number of usable placements in the selected window, so that a single recent result cannot swing the arrow. When the selected window IS the Last 2 Weeks baseline, NO trend indicator SHALL be shown (there is nothing to compare against); making the baseline view's trend meaningful (a week-over-week comparison) is out of scope for this change. The indicator SHALL NOT display a raw Power Score or numeric delta; it SHALL convey direction only (glyph + semantic color) and SHALL carry a localized accessible label (Spanish/English).

#### Scenario: Recent over-performance shows an up arrow
- **WHEN** the Last 7 Days window is selected and an archetype with at least the minimum recent decks has a recent finish quality above its Last 2 Weeks baseline beyond the deadband
- **THEN** its card shows an up ▲ indicator (rising), while its tier badge remains the stable Last-2-Weeks tier

#### Scenario: Recent under-performance shows a down arrow
- **WHEN** the Last 7 Days window is selected and an archetype with at least the minimum recent decks has a recent finish quality below its Last 2 Weeks baseline beyond the deadband
- **THEN** its card shows a down ▼ indicator (falling)

#### Scenario: Baseline window shows no indicator
- **WHEN** the Last 2 Weeks window is selected
- **THEN** no trend indicator is shown on any card, because the selected window is the baseline

#### Scenario: Too few recent decks shows a flat indicator
- **WHEN** the Last 7 Days window is selected and a displayed archetype has fewer than the minimum number of usable recent placements (including none)
- **THEN** its trend indicator is flat (–) rather than a direction driven by one or two results

#### Scenario: Trend indicator is localized and shows no number
- **WHEN** the active locale is Spanish or English and a trend indicator renders
- **THEN** it shows only a direction glyph with its semantic color and a localized accessible label, and displays no raw Power Score or numeric delta

### Requirement: Period-over-period metagame-share delta
Each displayed archetype card SHALL show a **share delta indicator** — an up ▲, down ▼, or flat – arrow **together with a signed numeric value** — reflecting how the archetype's **metagame share** in the selected window compares to its share in the **immediately-preceding, equal-length** window, both slices sourced from the retained deck corpus (within the 30-day retention). The preceding window SHALL be the equal-length period ending where the selected window begins:
- For **Last 7 Days**, the selected slice is the most recent 7 days and the preceding slice is the 7 days before it.
- For **Last 2 Weeks**, the selected slice is the most recent 2-week period and the preceding slice is the 2-week period before it.

The delta value SHALL be the difference in metagame share (percentage points), formatted in the mono data style with one decimal and an explicit sign (e.g. `+2.1`, `-1.7`). The indicator SHALL show ▲ with a positive value when the share rose beyond a small deadband, ▼ with a negative value when it fell beyond the deadband, and – (flat) otherwise. The indicator SHALL be shown on **both** windows (including the Last 2 Weeks baseline view). This indicator is **additive and distinct** from the existing recent-window performance trend arrow: both MAY appear on the same card and the performance trend arrow's behavior is unchanged. Displayed metagame share percentages SHALL be unchanged by this feature. The indicator SHALL carry a localized accessible label (Spanish/English); archetype names and other MTG proper nouns remain English in both locales.

The indicator SHALL be rendered in the card's **stat footer, right-aligned opposite the share percentage** it describes (not overlaid on the signature-card art), and SHALL remain legible over the card surface.

#### Scenario: Rising share shows an up arrow with a positive value
- **WHEN** an archetype's share in the selected window exceeds its share in the equal-length preceding window beyond the deadband
- **THEN** its card shows a ▲ indicator with the signed positive delta (e.g. `+2.1`) in the stat footer opposite the share %

#### Scenario: Falling share shows a down arrow with a negative value
- **WHEN** an archetype's share in the selected window is below its share in the equal-length preceding window beyond the deadband
- **THEN** its card shows a ▼ indicator with the signed negative delta (e.g. `-1.7`)

#### Scenario: Negligible change shows a flat indicator
- **WHEN** the share difference between the selected and preceding windows is within the deadband
- **THEN** the card shows a flat – indicator rather than a misleading direction

#### Scenario: Shown on the two-week baseline view
- **WHEN** the Last 2 Weeks window is selected
- **THEN** the share delta indicator IS shown (comparing the last 2 weeks to the preceding 2 weeks), even though the recent-window performance trend arrow is not shown on that view

#### Scenario: Shown alongside the performance trend arrow
- **WHEN** the Last 7 Days window is selected and a card displays the recent-window performance trend arrow
- **THEN** the share delta indicator is also shown, in the stat footer, visually distinct from the performance trend arrow

#### Scenario: Insufficient preceding data suppresses the indicator
- **WHEN** the preceding equal-length window has fewer than the minimum guard number of usable decks for the field (for example, because the database does not yet hold a full preceding period), so no meaningful comparison can be made
- **THEN** no share delta indicator is shown on the affected cards, rather than a spurious spike against an empty or near-empty baseline

#### Scenario: New-this-period archetype
- **WHEN** an archetype has decks in the selected window but none in the preceding window, and the preceding window otherwise meets the minimum-deck guard
- **THEN** its card shows a ▲ indicator with the full current share as the positive delta (a genuine rise)

#### Scenario: Indicator is localized
- **WHEN** the active locale is Spanish or English and a share delta indicator renders
- **THEN** it carries a localized accessible label describing the share change and direction, while the numeric value and archetype name are formatted consistently across locales
