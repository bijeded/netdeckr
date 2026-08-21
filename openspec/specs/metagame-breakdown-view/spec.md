# metagame-breakdown-view

## Purpose
The dashboard that derives a format and time-window's metagame breakdown from the decks stored in Supabase and renders the ranked top-20 archetype grid, including format and time-frame selection/persistence (in a filter sidebar), the per-format freshness indicator, loading/empty/error states, and bilingual (ES/EN) copy.
## Requirements
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

#### Scenario: Raw Power Score is not displayed
- **WHEN** an archetype card renders
- **THEN** no raw Power Score number is shown — only the tier badge conveys the archetype's performance level

### Requirement: Placement-derived Power Score inputs
The Power Score SHALL be computed only from each deck's final-standing bracket (e.g. `1`, `2`, `3-4`, `5-8`, `9-16`), mapping better standings to higher finish quality, and SHALL depend on how deep the archetype's decks finish rather than on how many decks it has. Increasing an archetype's number of decks without improving their standings SHALL NOT by itself raise its Power Score above a rival with fewer but deeper-finishing decks.

An event whose recorded standings are **not a genuine ranking** — a published-ladder event, where every qualifying decklist is published and the recorded positions are presentation order rather than a competitive result — SHALL contribute a **single flat finish quality** for each of its decks, identical across all of them, rather than a quality derived from each deck's recorded position. Such a deck SHALL NOT be dropped from scoring: qualifying for publication is itself a real result. An event SHALL be treated as unranked only when its recorded standings carry **no bracket range** AND the event has **no recorded player count**; an event exhibiting either a bracket range or a recorded player count SHALL be treated as genuinely ranked. The flat quality SHALL be set below the value a first-place finish would receive, so that no unranked event can contribute a champion-grade finish. This classification SHALL affect only the Power Score and its Tier badge; the metagame **share percentage**, header StatCard totals, trending, and decklists SHALL be unchanged.

#### Scenario: Deeper finishes score higher
- **WHEN** an archetype's decks are shifted to better standings (e.g. more 1st/2nd, fewer 9-16)
- **THEN** its Power Score does not decrease

#### Scenario: Volume without depth does not win
- **WHEN** archetype A appears many times but always in a low bracket, and archetype B appears fewer times but consistently in top brackets
- **THEN** B's Power Score is not lower than A's on account of A's larger deck count alone

#### Scenario: An unranked event contributes no champion
- **WHEN** an event has no recorded player count and its standings are a flat run of positions with no bracket range
- **THEN** every one of its decks receives the same flat finish quality, none of them receives the first-place quality, and none of them is dropped from scoring

#### Scenario: A bracket range marks a genuine ranking
- **WHEN** an event has no recorded player count but its standings include a bracket range such as `3-4` or `5-8`
- **THEN** its decks are scored from their recorded standings as normal, not flattened

#### Scenario: A recorded player count marks a genuine ranking
- **WHEN** an event records a player count
- **THEN** its decks are scored from their recorded standings as normal, regardless of whether its standings contain a bracket range

#### Scenario: Share and totals are unaffected by the classification
- **WHEN** unranked-event handling is applied
- **THEN** each archetype's metagame share percentage and the header StatCard totals are identical to what they were without it

### Requirement: Tournament-size weighting of the Power Score
The Power Score SHALL weight each deck's finish by the size of the tournament it came from, so that a given finish contributes **more effective statistical observations** when it was earned at a larger tournament and fewer when earned at a smaller one. Concretely, a finish's contribution to the uncertainty adjustment's effective sample SHALL scale with its event's player count, so an equal finish quality proven across larger fields yields a higher (less-shrunken) Power Score than the same finish quality earned only at tiny events.

Above a reference field size the weight SHALL continue to grow with player count at a **diminishing rate**, such that each doubling of the field adds a fixed increment to the weight. Two events whose player counts differ by a factor of two SHALL therefore receive **distinct** weights at every size the data can produce, so that arbitrarily large events remain distinguishable from one another rather than saturating at a shared ceiling. Weighting SHALL remain bounded, but the bound SHALL sit far enough above the largest plausible field that it acts as a guard against implausible recorded sizes rather than as a calibration limit on real events. The weighting of events **at or below** the reference field size SHALL be unchanged.

A deck whose event has **no recorded player count** SHALL be weighted as a **small event** (a conservative small-size default), and SHALL NOT be dropped from scoring. Size weighting SHALL affect only the Power Score and its Tier badge; the metagame **share percentage**, header StatCard totals, trending, and decklists SHALL be unchanged. When no deck in the field carries a recorded size (e.g. before the pipeline records sizes), scoring SHALL degrade gracefully by treating every event as the small-size default and SHALL NOT error.

#### Scenario: Larger tournaments carry more weight
- **WHEN** two archetypes have identical finish qualities but one earned them only at large tournaments and the other only at tiny tournaments
- **THEN** the large-tournament archetype receives a strictly higher Power Score

#### Scenario: Very large events stay distinguishable
- **WHEN** one event's player count is at least double another's, and both are well above the reference field size
- **THEN** the larger event's finishes carry a strictly greater weight than the smaller event's

#### Scenario: Each doubling adds a fixed increment
- **WHEN** three events above the reference size have player counts in the ratio 1 : 2 : 4
- **THEN** the weight increase from the first to the second equals the increase from the second to the third

#### Scenario: Weighting below the reference size is unchanged
- **WHEN** an event's player count is at or below the reference field size
- **THEN** its weight is identical to the weight it received before this change

#### Scenario: Implausible sizes are bounded
- **WHEN** an event records a player count far beyond any plausible tournament field
- **THEN** its weight is clamped to the guard bound rather than growing without limit

#### Scenario: Missing size defaults to a small event
- **WHEN** a deck's event has no recorded player count
- **THEN** that deck is weighted as a small event rather than dropped, and scoring completes without error

#### Scenario: Share and totals are unaffected
- **WHEN** size weighting is applied
- **THEN** each archetype's metagame share percentage and the header StatCard totals are identical to what they were without size weighting

#### Scenario: Graceful degradation before sizes exist
- **WHEN** no deck in the field carries a recorded player count
- **THEN** every event is treated as the small-size default and Power Scores are computed without error

### Requirement: Small-sample statistical adjustment without a hard floor
The Power Score SHALL apply a statistical lower-bound adjustment (a Wilson-style shrink) so that an archetype supported by few decks — or by decks from only small tournaments — is pulled toward the low end in proportion to its uncertainty, and a strong record supported by more decks (or larger tournaments) is trusted more. The general adjustment SHALL NOT force low-count archetypes to the fringe tier regardless of results. In addition, to keep the top tier a strong signal, **Tier 1 eligibility MAY require a minimum number of supporting decks**: an archetype supported by fewer than that minimum SHALL NOT be assigned T1 on the strength of a tiny sample, but SHALL still be placed by the uncertainty adjustment into a lower tier (T2 or below) according to its Power Score rather than being forced to the fringe tier. The small-sample penalty SHALL be tuned so that single-tiny-event winners do not flood Tier 1 in large formats.

#### Scenario: A single lucky win does not reach the top tier
- **WHEN** an archetype is represented by exactly one deck that placed 1st over the Last 2 Weeks
- **THEN** its Power Score is materially reduced by the uncertainty adjustment and, being below the Tier 1 minimum-deck floor, it is not assigned T1 on that single result

#### Scenario: A strong record over enough decks is trusted
- **WHEN** an archetype has many decks that consistently finish in top brackets
- **THEN** the uncertainty adjustment leaves its Power Score high enough to earn a high tier

#### Scenario: A below-floor strong performer lands in a lower tier, not the fringe
- **WHEN** a genuinely strong archetype is supported by fewer decks than the Tier 1 minimum floor
- **THEN** it is placed in the next tier down (T2 or below) by its Power Score rather than being forced to the fringe tier

#### Scenario: Tier 1 stays a small signal in large formats
- **WHEN** tiers are computed for a large format that previously showed a broad Tier 1 inflated by single-tiny-event winners
- **THEN** those single-tiny-event winners no longer appear in Tier 1, while tier order remains monotonic in Power Score

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
The archetype card SHALL keep its overlaid indicators — the tier badge, the color-identity mana pips, and the recent-window trend arrow — readable regardless of the brightness or busyness of the signature-card art behind them. Each overlaid indicator SHALL carry its own dark backdrop so that its legibility does not depend on the tone of the art beneath it: the art SHALL NOT act as the background against which the indicator's text or fill is read. The tier badge and the trend arrow SHALL each render their label against that backdrop at a contrast ratio of at least 4.5:1, and this floor SHALL hold for every tier — including the fringe tier — and for every trend direction, over art of any brightness. The indicators SHALL retain their translucent, self-lit character: each backdrop SHALL remain a blurred, partially translucent dark surface rather than a flat opaque block, and the art behind it SHALL remain perceptible as texture. The tier badge and the trend arrow SHALL remain comparable in visual prominence to one another; neither SHALL be quieted to make the other stand out.

#### Scenario: Indicators are legible over bright art
- **WHEN** an archetype card renders its signature-card art and that art is bright or light-toned behind an overlaid indicator
- **THEN** the indicator's own dark backdrop keeps its label readable at the required contrast, without depending on the art's tone

#### Scenario: Fringe tier is as readable as the top tier
- **WHEN** a fringe-tier (Rogue/Otros) badge and a T1 badge each render over art of any brightness
- **THEN** both labels meet the same contrast floor, and the fringe tier is distinguished by its position on the tier ramp rather than by being faint or hard to read

#### Scenario: Art remains visible through the indicators
- **WHEN** an overlaid indicator renders over signature-card art
- **THEN** the art behind it stays perceptible as blurred texture, so the indicator reads as a translucent self-lit chip rather than an opaque block

#### Scenario: Mana pips stay distinguishable over bright art
- **WHEN** the color-identity mana pips render over bright or busy art
- **THEN** each pip's color remains distinguishable from its neighbours and from the art behind it

#### Scenario: Badge and trend arrow hold equal weight
- **WHEN** an archetype card renders both a tier badge and a trend arrow
- **THEN** the two chips read as equally prominent, sharing the same backdrop treatment and comparable size

#### Scenario: Vignette darkens the badge corners
- **WHEN** an archetype card renders its signature-card art
- **THEN** a non-interactive overlay darkens the art toward its edges and corners while leaving the center near-transparent, so the art stays visible and the mana pips have a legible backdrop

#### Scenario: Overlay does not intercept interaction
- **WHEN** the user clicks anywhere on the card art region
- **THEN** the vignette overlay does not intercept the click, and the card's expand/collapse behavior is unchanged

#### Scenario: Tier badge and trend arrow are self-lit
- **WHEN** the tier badge or trend arrow renders over the art
- **THEN** each carries a glow in its own color (tier hue for the badge, up/down/flat color for the trend arrow) so it reads as legible even against art of a similar tone

### Requirement: Tier badge conveys tier order without relying on color
The tier badge SHALL encode an archetype's tier order through at least one visual channel other than hue, so that T1 reads as higher than T2, T2 higher than T3, and T3 higher than the fringe tier when scanning the archetype grid. That ordering SHALL be monotonic across the four tiers and SHALL remain perceptible when hue information is unavailable or unreliable — for example in greyscale, to a color-vision-deficient viewer, or over art that competes with the badge's hue. Hue SHALL be retained as a secondary channel, keeping each tier's established color association (T1 violet, T2 cyan, T3 and the fringe tier neutral). This requirement governs presentation only: it SHALL NOT change how tiers are assigned, which continues to follow the Power Score, natural-breaks cutoffs, and Last-2-Weeks basis defined elsewhere in this capability.

#### Scenario: Tier order is visible when scanning the grid
- **WHEN** an archetype grid renders cards spanning several tiers
- **THEN** the badges' non-hue ordering channel makes the relative tier of each card apparent at a glance, without the viewer having to read each label

#### Scenario: Tier order survives without color
- **WHEN** the tier badges are viewed in greyscale or by a viewer who cannot distinguish the tier hues
- **THEN** the tier order remains readable from the non-hue channel alone, in the same T1 → T2 → T3 → fringe order

#### Scenario: Tier hues are preserved
- **WHEN** a badge of each tier renders
- **THEN** each still carries its established tier hue (T1 violet, T2 cyan, T3 and fringe neutral) alongside the ordering channel

#### Scenario: Presentation change does not affect tier assignment
- **WHEN** an archetype's tier is computed for a given format and window
- **THEN** it is assigned exactly as before from its Last-2-Weeks Power Score and the natural-breaks cutoffs, with only the badge's rendering changed

### Requirement: Event size filter
The dashboard SHALL let the user restrict the metagame to events of a single size class, where an event's size is its reported tournament size (`player_count`). The control SHALL sit **inside the existing "Event" sidebar filter group** — after that group's "Event" heading and above its event select — and SHALL carry **no visible heading of its own**, so the group reads as one Event filter with two controls rather than two separate groups. Having no visible label, the control SHALL still expose a localized accessible name so it is distinguishable from the event select to assistive technology. It SHALL offer an "All event sizes" default entry plus five mutually exclusive entries:

| Entry | Matches events whose size is |
| --- | --- |
| Small | fewer than 32 players |
| Medium | 32 to 95 players |
| Large | 96 to 255 players |
| Massive | 256 players or more |
| Unsized | not reported by the source |

Selecting a size class from this control SHALL restrict the derived breakdown and per-archetype decks to the decks of events in that class, combined (AND) with the active format, time-frame, event, archetype, and tier filters. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the retained decks**, exactly as it is under any other corpus-narrowing filter. Events whose size is not reported SHALL be matched **only** by the "Unsized" entry — they SHALL NOT be treated as Small, and they SHALL NOT be silently excluded from the "All sizes" default. The default state SHALL be "All event sizes" (no size restriction).

Size classification SHALL NOT alter tier assignment: each archetype's tier remains its Last-2-Weeks Power Score against the whole 2-week field, unaffected by the selected size class, exactly as under the Event filter.

An active size class SHALL uncap the grid: every archetype of the retained decks SHALL be displayed, with the default view's top-12 cap not applied, exactly as under the Event filter.

An active size class SHALL also be named in the grid caption above the freshness line, using a **short** label — "Small", "Mid", "Large", "Massive", "Unknown" (localized) — with no size range or count appended. The caption SHALL compose with the other filters the same way the event name does: when an archetype is isolated or a tier is selected, the size label SHALL be folded into that caption alongside the event name rather than replacing it, and when a size class is the only active filter the caption SHALL be the size label alone, replacing the "Top N most popular archetypes" popularity caption.

Every entry SHALL be offered whether or not the current (format, window) contains any event of that class; an entry matching no events SHALL remain selectable and SHALL lead to the localized empty state rather than being hidden. All labels SHALL be localized in Spanish and English via react-i18next.

#### Scenario: Selecting a size class narrows the breakdown
- **WHEN** the user selects a size class from the Event size filter
- **THEN** the archetype grid, ranks, shares, StatCard totals, and freshness derive from only the decks of events in that class within the active format and time-frame

#### Scenario: Percentages reflect share within the retained decks
- **WHEN** a size class is selected
- **THEN** each archetype card's percentage equals its deck count among the retained decks divided by the total retained decks, summing to 100% across the shown field

#### Scenario: Band boundaries are exact
- **WHEN** events of 31, 32, 95, 96, 255, and 256 players are present in the corpus
- **THEN** the 31-player event matches Small, the 32- and 95-player events match Medium, the 96- and 255-player events match Large, and the 256-player event matches Massive

#### Scenario: Unsized events are their own class
- **WHEN** an event has no reported tournament size and the user selects "Unsized"
- **THEN** that event's decks are retained, and they are excluded from Small, Medium, Large, and Massive alike

#### Scenario: A size class uncaps the grid
- **WHEN** a size class is selected, more than 12 archetypes are present among the retained decks, and no archetype or tier filter is active
- **THEN** every one of those archetypes is displayed, with the top-12 display cap not applied

#### Scenario: The caption names the size class with a short label
- **WHEN** a size class is the only active filter
- **THEN** the caption above the freshness line reads that class's short label ("Small", "Mid", "Large", "Massive", or "Unknown"), with no size range, player count, or archetype count appended, replacing the "Top N most popular archetypes" caption

#### Scenario: The size label folds into the archetype and tier captions
- **WHEN** a size class is selected together with an isolated archetype, or with a tier
- **THEN** the caption combines that archetype name or tier label with the size label, rather than either one replacing the other

#### Scenario: The size and event labels appear together
- **WHEN** a size class and a single event are both selected
- **THEN** the caption carries both the size label and the event's name and abbreviated date

#### Scenario: Caption size labels are shorter than the filter's own labels
- **WHEN** the caption names the medium or unsized class
- **THEN** it reads "Mid" and "Unknown" respectively — the short caption forms — while the sidebar control keeps its fuller, self-describing entries

#### Scenario: The size control sits inside the Event group without its own heading
- **WHEN** the sidebar renders
- **THEN** the size control appears between the "Event" group heading and the event select, with no heading of its own, and the sidebar shows no separate size filter group

#### Scenario: The unlabelled size control is still identifiable to assistive technology
- **WHEN** the size control is reached by a screen reader
- **THEN** it announces a localized accessible name distinguishing it from the event select in the same group

#### Scenario: Unsized events are not hidden by the default
- **WHEN** the Event size filter is set to "All event sizes"
- **THEN** the breakdown includes the decks of events with and without a reported size, with no size restriction

#### Scenario: A size class with no matching events shows an empty state
- **WHEN** the user selects a size class that no event in the current format and window falls into
- **THEN** the entry is still selectable and a localized empty state is shown in place of the grid

#### Scenario: Tiers are unaffected by the size filter
- **WHEN** a size class is selected
- **THEN** each shown archetype keeps the tier it carries under the unfiltered view, assigned from its Last-2-Weeks Power Score against the whole 2-week field

#### Scenario: Size labels are localized
- **WHEN** the locale is switched
- **THEN** the "All event sizes" default, the Small/Medium/Large/Massive/Unsized labels, and the control's accessible name switch language

### Requirement: Event filter
The dashboard SHALL provide a sidebar filter group, headed "Event" (localized), that lets the user restrict the metagame to a single tournament event. The group SHALL contain the event-size control (see the Event size filter requirement) above its event select, under the single "Event" heading. The group SHALL offer an "All events" default entry plus one entry per event present in the current (format, window) **and in the active event-size class**, each labelled with the event name, its abbreviated date, and — when the event's tournament size (`player_count`) is known — that size appended after the date as a localized parenthetical (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). When the size is unknown, the entry SHALL show only the name and abbreviated date. Selecting an event SHALL restrict the derived breakdown and per-archetype decks to that event's decks only, combined (AND) with the active format, time-frame, event-size, and any archetype filter. Each archetype card's metagame percentage SHALL be recomputed as that archetype's share **within the selected event** (its deck count over the event's total decks), not its share of the whole window. In the default popularity view (no archetype isolated and no tier selected), selecting an event SHALL display **all** of that event's archetypes uncapped (the broad-view top-12 display cap is not applied), and SHALL replace the "Top N most popular archetypes" caption — in the same position, above the freshness line — with the selected event's name, abbreviated date, and known size (e.g. "Standard Challenge — 24 Jun 2026 (128 players)"). The tournament size SHALL be shown identically (same localized parenthetical, omitted when unknown) in both the dropdown entry and the caption. The default state SHALL be "All events" (no event restriction). All labels SHALL be localized in Spanish and English via react-i18next (including the count-aware "players"/"jugadores" size text), with MTG proper nouns (including the event name) kept in English in both locales.

#### Scenario: Selecting an event narrows the breakdown
- **WHEN** the user selects a single event from the Event filter
- **THEN** the archetype grid, ranks, shares, and freshness derive from only that event's decks within the active format and time-frame

#### Scenario: Percentages reflect share within the selected event
- **WHEN** an event is selected
- **THEN** each archetype card's percentage equals that archetype's deck count in the event divided by the event's total decks (summing to 100% across the event), not its share of the full window

#### Scenario: Event list reflects the current format and window
- **WHEN** the Event filter group renders for a given format and time-frame
- **THEN** it lists exactly the events whose decks fall within that (format, window), each shown by name and abbreviated date (with the tournament size appended when known), plus the "All events" default

#### Scenario: Event list is narrowed by an active size class
- **WHEN** an event-size class is selected and the Event filter group renders
- **THEN** it lists only the events of that size class within the current (format, window), plus the "All events" default, so no unreachable event can be selected

#### Scenario: Known tournament size is shown after the date
- **WHEN** a selected or listed event has a known tournament size (`player_count`)
- **THEN** its label (in both the dropdown entry and the caption) appends the size after the date as a localized parenthetical (e.g. "(128 players)" / "(128 jugadores)", singular "(1 player)" / "(1 jugador)")

#### Scenario: Unknown tournament size is omitted
- **WHEN** a selected or listed event has no known tournament size (`player_count` is null)
- **THEN** its label shows only the event name and abbreviated date, with no size parenthetical and no placeholder

#### Scenario: All events default shows the full breakdown
- **WHEN** the Event filter is set to "All events"
- **THEN** the breakdown is derived from every deck in the active (format, window) with no event restriction, and the caption returns to "Top N most popular archetypes"

#### Scenario: Event-filtered popularity view is uncapped and named after the event
- **WHEN** an event is selected and neither an archetype nor a tier filter is active
- **THEN** every archetype present in that event is shown (the top-12 display cap is not applied) and the caption above the freshness line reads the event's name followed by its abbreviated date

#### Scenario: Expanding a card under an event filter shows all its decks
- **WHEN** an event is selected and the user expands an archetype card
- **THEN** every one of that archetype's decks in the event is shown (the broad-view display cap is not applied), ordered best finish first

### Requirement: Archetype filter
The dashboard SHALL provide a sidebar filter group, headed "Archetype" (localized), that lets the user collapse the grid to a single archetype. The group SHALL offer an "All archetypes" default entry plus one entry per archetype present in the current filtered view — **uncapped**, so every archetype in the corpus (or every archetype within the selected event) is selectable, not only those shown in the top-12 grid. Selecting an archetype SHALL collapse the grid to show only that archetype's card, and SHALL auto-expand that card to list **all** of the archetype's decks under the combined active filters — not just the limited display set — each shown by event and date, in descending date order. The isolated view SHALL be captioned like every other view: in the same position above the freshness line, the caption SHALL name the isolated archetype, folding in the selected event's label when an event filter is also active. The default state SHALL be "All archetypes". Archetype proper nouns SHALL stay in English in both locales; the heading and default entry SHALL be localized.

#### Scenario: Selecting an archetype isolates and auto-expands it
- **WHEN** the user selects a single archetype from the Archetype filter
- **THEN** the grid collapses to only that archetype's card, and that card is auto-expanded showing every deck of that archetype under the active format, time-frame, and event filter

#### Scenario: The isolated view is captioned with the archetype name
- **WHEN** a single archetype is isolated
- **THEN** the caption above the freshness line names that archetype, in the same position the popularity, event, and tier captions occupy

#### Scenario: Archetype caption folds in an active event filter
- **WHEN** an archetype is isolated and an event filter is also active
- **THEN** the caption combines the archetype name with the event's name and abbreviated date

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
The dashboard SHALL apply the event-size, event, archetype, tier, and time-frame filters together as a logical AND over the active format's deck corpus, re-deriving the metagame breakdown from the resulting deck subset. Applying the filters SHALL NOT require any additional data fetch beyond the corpus already loaded for the active format.

#### Scenario: Event and archetype filters stack with the time frame
- **WHEN** an event, an archetype, and a non-default time-frame are all selected
- **THEN** the shown breakdown and decks reflect the intersection of all three within the active format

#### Scenario: Tier and event filters stack
- **WHEN** a tier and an event are both selected
- **THEN** the grid shows that tier's archetypes present in the event, with shares recomputed within the event

#### Scenario: Size stacks with the other filters
- **WHEN** an event-size class is selected together with an archetype, a tier, and/or a non-default time-frame
- **THEN** the shown breakdown and decks reflect the intersection of all of them within the active format

#### Scenario: Size filtering needs no additional fetch
- **WHEN** the user changes the event-size selection
- **THEN** the breakdown is re-derived from the corpus already loaded for the active format, with no further request to the database

### Requirement: Auto-reset of invalid filter selections
When a selected event or archetype is no longer present after a change to the format, time-frame, event size, or another filter, the dashboard SHALL silently reset that filter group to its "All" default rather than showing a stale selection or an error. (The Tier and Event size filters' options are always selectable regardless of data, so neither is auto-reset for absence — a tier or size class that matches nothing shows an empty state instead; see their respective requirements. The Tier filter is only reset by the archetype-precedence rule and by "Clear filters".)

#### Scenario: Selected event disappears after switching format
- **WHEN** an event is selected and the user switches to a format or window in which that event does not exist
- **THEN** the Event filter silently resets to "All events" and the unrestricted breakdown for the new (format, window) is shown

#### Scenario: Selected archetype disappears after a filter change
- **WHEN** an archetype is selected and a format, window, or event change removes that archetype from the view
- **THEN** the Archetype filter silently resets to "All archetypes"

#### Scenario: Selected event falls outside a newly selected size class
- **WHEN** an event is selected and the user then selects a size class that event does not belong to
- **THEN** the Event filter silently resets to "All events" and the size class is applied, so the most recent choice is the one honored

#### Scenario: A selected size class is never auto-reset for absence
- **WHEN** the selected size class matches no event after a format or time-frame change
- **THEN** the Event size filter keeps that selection and the view shows the localized empty state rather than reverting to "All event sizes"

### Requirement: Clearing filters
The dashboard SHALL let the user clear filters both per-group and globally. Each filter group SHALL expose its "All" default entry that unfilters that group alone. The dashboard SHALL provide a "Clear filters" control (localized) in the sidebar that resets the event-size, event, archetype, and tier filters to their "All" defaults at once, and SHALL additionally provide an equivalent localized "Reset" control in the main window, right-aligned on the grid caption row, so that clearing is reachable without opening the sidebar. The main-window control SHALL always be present and SHALL be disabled — not hidden — when no filter is active, so that toggling a filter does not shift the layout of the grid below it. Enabled, it SHALL read as an available action and SHALL be clearly distinguishable from its disabled state, which SHALL recede rather than compete with the caption beside it. Both controls SHALL have identical effect. Filter selections SHALL be in-memory only and reset to their defaults on reload; they SHALL NOT be persisted in the URL. The enabled treatment SHALL be visually distinct from the dashboard's data indicators: it SHALL NOT reuse the share-delta trend colors, so that the control is never mistaken for a metric by the archetype cards below it. The disabled treatment SHALL remain neutral — carrying no accent hue at all — rather than being a faded variant of the enabled one.

#### Scenario: Per-group default unfilters one group
- **WHEN** the user selects a group's "All" default entry while another filter is active
- **THEN** only that group is unfiltered and the other active filters remain applied

#### Scenario: Clear filters resets all groups
- **WHEN** the user activates the "Clear filters" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the event-size, event, archetype, and tier filters all reset to their "All" defaults and the default top-12 caption view returns

#### Scenario: Main-window reset resets all groups
- **WHEN** the user activates the main-window "Reset" control with an event-size, event, archetype, and/or tier filter active
- **THEN** the filters reset exactly as the sidebar's "Clear filters" control does, and the caption returns to the default popularity view

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

#### Scenario: Filters do not persist across reloads
- **WHEN** the user reloads the page with an event-size, event, archetype, and/or tier filter active
- **THEN** the filters return to their "All" defaults and the URL carries no filter param

#### Scenario: The enabled Reset does not read as a metric
- **WHEN** a filter is applied and the "Reset" control is enabled while the grid below shows archetype cards carrying rising/falling share-delta indicators
- **THEN** the control's accent is not the share-delta trend colors, and it remains distinguishable from those indicators

#### Scenario: The enabled Reset separates from the caption beside it
- **WHEN** a filter is applied and the "Reset" control is enabled on the grid caption row
- **THEN** its accent differs from the caption text's own accent, so the two do not read as one block

#### Scenario: The disabled Reset carries no accent hue
- **WHEN** no filter is active and the "Reset" control is disabled
- **THEN** it is rendered in the neutral muted treatment with no accent hue, not as a faded version of the enabled control's accent

### Requirement: Tier filter
The dashboard SHALL provide a sidebar filter group, headed "Tiers" (localized), placed after the Archetype filter, that lets the user restrict the grid to archetypes of a single performance tier. The group SHALL offer an "All tiers" default entry plus one entry per tier: Tier 1, Tier 2, Tier 3, and Rogue/Otros (localized labels), mapping to the existing T1/T2/T3/Otros tiers. Selecting a tier SHALL show **all** archetypes of that tier (uncapped) as normal collapsible cards — each click-to-expand for its decks, not auto-expanded — and SHALL replace the "Top N most popular archetypes" popularity caption (in the same position, above the freshness line) with a localized caption naming the selected tier and the count of archetypes shown (e.g. "Tier 1 — 13 archetypes"; the fringe tier uses the "Rogue"/"Otros" label). When an event filter is also active, the tier caption SHALL combine the tier label with the selected event's name and abbreviated date (e.g. "Tier 1 — Standard Challenge — 24 Jun 2026"). The tier grouping SHALL use the same whole-2-week-corpus tier assignment as the tier badges. The default state SHALL be "All tiers"; the heading, default entry, and tier labels SHALL be localized. The StatCard header strip SHALL narrow to the selected tier (its archetype count, their decks, and the distinct events among them).

#### Scenario: Selecting a tier shows all its archetypes uncapped
- **WHEN** the user selects Tier 1 (or 2/3/Rogue-Otros) from the Tier filter
- **THEN** the grid shows every archetype assigned to that tier as a collapsible card, with no top-12 cap, and the caption names the tier and count (e.g. "Tier 1 — 13 archetypes")

#### Scenario: Tier caption folds in an active event filter
- **WHEN** a tier is selected and an event filter is also active
- **THEN** the caption combines the tier label with the event's name and abbreviated date (e.g. "Tier 1 — Standard Challenge — 24 Jun 2026")

#### Scenario: Tier cards are collapsible, not auto-expanded
- **WHEN** a tier is selected
- **THEN** each shown archetype card starts collapsed and expands its decks only on click

#### Scenario: Tier with no matching archetypes shows an empty state
- **WHEN** the selected tier matches no archetypes under the combined active filters
- **THEN** a localized empty state is shown in place of the grid

#### Scenario: Tier labels are localized
- **WHEN** the locale is switched
- **THEN** the "All tiers" default and the Rogue/Otros label switch language (Tier 1/2/3 numerals and the "Tiers" heading are shared MTG vocabulary)

### Requirement: Archetype filter takes precedence over the tier filter
When both an archetype and a tier are selected, the single-archetype isolation SHALL win: the grid SHALL isolate and auto-expand the chosen archetype's card. If the chosen archetype falls outside the selected tier, the Tier filter SHALL silently reset to "All tiers" (mirroring the invalid-selection auto-reset), so the view is never internally contradictory. The resolution SHALL favor the most recent choice: selecting a tier while a contradictory archetype is isolated SHALL clear the archetype filter and apply the tier, just as selecting an archetype clears a contradictory tier. Neither filter SHALL silently discard the selection the user just made.

#### Scenario: Choosing an archetype outside the selected tier resets the tier
- **WHEN** a tier is active and the user selects an archetype that is not in that tier
- **THEN** the grid isolates and auto-expands that archetype's card and the Tier filter silently resets to "All tiers"

#### Scenario: Archetype within the selected tier stays isolated
- **WHEN** a tier is active and the user selects an archetype that is in that tier
- **THEN** the grid isolates and auto-expands that archetype's card

#### Scenario: Choosing a tier outside the isolated archetype clears the archetype
- **WHEN** an archetype is isolated and the user selects a tier that archetype does not belong to
- **THEN** the tier filter is applied, the archetype filter resets to "All archetypes", and the grid shows that tier's archetypes

#### Scenario: Choosing the isolated archetype's own tier keeps it isolated
- **WHEN** an archetype is isolated and the user selects the tier that archetype belongs to
- **THEN** both filters stay applied and the grid keeps isolating that archetype

### Requirement: Archetype win trophy
The archetype card SHALL display a 🏆 trophy indicator when the archetype has at least one first-place deck in the currently displayed (filtered) view. The win count SHALL be the number of that archetype's decks whose finish is first place, counted from the same window- and event-filtered deck set that determines the archetype's share (so the trophy tracks the active format, time-frame, and event filters). When the archetype has exactly one first-place deck, the card SHALL show a bare 🏆 with no multiplier; when it has more than one, the card SHALL show 🏆 followed by a `×N` multiplier where N is the win count. When the archetype has no first-place deck, no trophy SHALL be shown. The trophy SHALL render inline after the archetype name, in a smaller font than the name, and SHALL NOT prevent the archetype name from truncating with an ellipsis. The 🏆 is a deliberate, scoped exception to the project's "no emoji" rule, permitted solely to mark event wins.

#### Scenario: A single win shows a bare trophy
- **WHEN** an archetype in the displayed view has exactly one first-place deck
- **THEN** its card shows a 🏆 after the archetype name with no multiplier

#### Scenario: Multiple wins show a multiplier
- **WHEN** an archetype in the displayed view has more than one first-place deck
- **THEN** its card shows 🏆 followed by `×N`, where N is the number of first-place decks

#### Scenario: No wins shows no trophy
- **WHEN** an archetype in the displayed view has no first-place deck
- **THEN** its card shows no trophy indicator

#### Scenario: Win count reflects the active filters
- **WHEN** an event filter is applied so the displayed decks are a single event
- **THEN** each archetype's trophy count reflects only that event's first-place decks (at most one archetype shows a bare 🏆)

#### Scenario: Trophy has a localized accessible label
- **WHEN** the trophy renders and the active locale is English or Spanish
- **THEN** it carries a localized, count-aware accessible label (e.g. "1 event win" / "3 event wins"; "1 victoria" / "3 victorias")

#### Scenario: Trophy does not crowd out the archetype name
- **WHEN** an archetype with a long name and at least one win renders
- **THEN** the archetype name truncates with an ellipsis while the trophy remains fully visible after it

### Requirement: Header StatCard strip
The dashboard SHALL display a StatCard strip in the header, right-aligned on the same row as the format title, showing three metrics for the currently displayed metagame: the number of **Events**, the number of **Archetypes**, and the number of **Decks**. The metrics SHALL reflect the currently displayed corpus: with no event or archetype filter active they SHALL report the whole (format, window); when an event or archetype filter is active they SHALL narrow to the filtered subset. The **Archetypes** metric SHALL be the count of distinct archetypes in that corpus (not the capped number of archetype cards shown in the grid). Because the archetype filter is display-only (it does not narrow the derived breakdown), when an archetype is selected the strip SHALL reflect that isolated archetype: Archetypes = 1, Decks = that archetype's decks under the active filters, and Events = the distinct events among those decks. Numbers SHALL render in the monospace font with thousands separators (e.g. `1,284`); the metric labels SHALL be localized in Spanish and English via react-i18next. Each of the three cards SHALL additionally be an interactive control that opens its filter modal and SHALL be reachable by keyboard with a visible focus indicator. The strip's placement SHALL NOT change the existing title, time-frame pill, or freshness indicator.

#### Scenario: Strip reports the whole window when unfiltered
- **WHEN** a format and time-frame are selected with no event or archetype filter
- **THEN** the strip shows the total events, distinct archetypes, and total decks in that (format, window)

#### Scenario: Archetype count is the distinct total, not the shown rows
- **WHEN** the window contains more distinct archetypes than the grid's display cap
- **THEN** the Archetypes metric shows the true distinct total, not the number of cards rendered

#### Scenario: Event filter narrows the strip
- **WHEN** an event is selected
- **THEN** the strip's events, archetypes, and decks reflect only that event's decks

#### Scenario: Archetype filter narrows the strip to the isolated archetype
- **WHEN** an archetype is selected
- **THEN** the strip shows Archetypes = 1, Decks = that archetype's deck count, and Events = the number of distinct events those decks came from

#### Scenario: Strip is right-aligned and leaves the rest of the header unchanged
- **WHEN** the header renders
- **THEN** the StatCard strip appears right-aligned on the title row while the format title, time-frame pill, and freshness indicator keep their existing positions

#### Scenario: Labels are localized
- **WHEN** the active locale is Spanish or English
- **THEN** the three metric labels render in that language while the numbers render in the monospace font with thousands separators

#### Scenario: Cards are reachable by keyboard
- **WHEN** the user tabs through the header
- **THEN** each of the three StatCards receives focus with a visible indicator and can be activated to open its filter modal

### Requirement: StatCard filter modals
Each of the three header StatCards SHALL act as a control that opens a modal listing the options for one filter: **Events** opens the event filter, **Archetypes** opens the archetype filter, and **Decks** opens the tier filter. Each modal SHALL present the breakdown of the metric shown on its card — one row per event, per archetype, or per tier.

The **Archetypes** and **Decks** modals' rows SHALL each carry exactly one figure accounting for that row's part of the card's total — the archetype's metagame share, and the tier's archetype count respectively. No modal row SHALL carry a second figure column.

The **Events** modal SHALL instead describe each event across three columns — its **date**, its **name**, and its **player count** — with no per-event deck count. Its breakdown of the Events card is the list itself, one row per event, so no row carries a figure accounting for a share of that total. Each of the three columns SHALL be reserved across the whole list so that the dates form one vertical band, the names another, and the player counts a third, rather than each fact trailing the end of its own row's preceding text. A fact the data does not record — an event with no date, or an event with no reported player count — SHALL be named in that column by a localized word meaning "unknown", rather than omitted or replaced by a punctuation mark, so that a missing value is visibly distinct from a value that was not asked for and is announced as its meaning to assistive technology.

Selecting a row SHALL apply that filter and close the modal. Modal titles, row labels, count-aware figures, and the "All …" entries SHALL be localized in Spanish and English; event and archetype names are proper nouns and stay in English in both locales. The modals SHALL offer no search or free-text filtering; rows SHALL keep the ordering already used elsewhere in the dashboard — archetypes by metagame share descending, events by date descending, tiers in T1, T2, T3, Rogue order.

#### Scenario: Events card opens the event filter
- **WHEN** the user activates the Events StatCard
- **THEN** a modal opens listing every event in the current format and window, each row showing the event's abbreviated date, then its name, then its player count, in that order

#### Scenario: Event facts form their own columns
- **WHEN** the events modal lists rows whose names and dates are of differing lengths
- **THEN** the dates are aligned in a column of their own, the names in another, and the player counts in a third, each row's three cells lining up with the corresponding cells of every other row

#### Scenario: An unrecorded event fact is named, not punctuated
- **WHEN** the events modal lists an event with no reported player count, or an event with no recorded date
- **THEN** that row shows a localized word meaning "unknown" in the corresponding column, keeping its place in the column band, and the row remains selectable and applies the event filter like any other

#### Scenario: The unrecorded-fact word is localized
- **WHEN** the events modal is opened in Spanish and in English with an event whose date or player count is unrecorded
- **THEN** the word reads in the active locale in each case, and the date column is wide enough for the longer of the two without the row wrapping

#### Scenario: The events modal carries no deck count
- **WHEN** the user opens the Events modal
- **THEN** no row shows a count of the decks belonging to that event, and no empty column is left where such a figure previously sat

#### Scenario: The "All events" row spans the full width
- **WHEN** the events modal opens
- **THEN** its leading "All events" row spans the full width of the row rather than taking the date, name, and player-count columns, and does not name those inapplicable facts as unknown

#### Scenario: Archetypes card opens the archetype filter
- **WHEN** the user activates the Archetypes StatCard
- **THEN** a modal opens listing every archetype in the current corpus in share-descending order, each row showing its color-identity pips, name, tier badge, and metagame share

#### Scenario: Tier badges form their own column
- **WHEN** the archetype modal lists rows whose names are of differing lengths
- **THEN** the tier badges are aligned in a column of their own between the names and the share figures, rather than each trailing the end of its own row's name

#### Scenario: Decks card opens the tier filter
- **WHEN** the user activates the Decks StatCard
- **THEN** a modal opens listing the four tiers, each row showing the tier badge, its localized label, and the number of archetypes in that tier

#### Scenario: Tier rows carry the archetype count alone
- **WHEN** the tier modal lists its rows
- **THEN** each row carries the archetype count and no deck-count column is rendered anywhere in the list

#### Scenario: The tier modal's figures account for the whole field
- **WHEN** the tier modal is opened with no event or archetype filter active
- **THEN** the "All tiers" row shows the total number of archetypes in the current format and window, and the four tier rows' archetype counts sum to that total

#### Scenario: Tier figures are count-aware in both locales
- **WHEN** a tier contains exactly one archetype
- **THEN** that row's figure reads in the singular in the active locale (English "1 archetype", Spanish "1 arquetipo"), and rows with other counts read in the plural

#### Scenario: The other modals keep a single figure column
- **WHEN** the user opens the Archetypes modal or the Decks modal
- **THEN** each row carries exactly one figure — the archetype's metagame share, or the tier's archetype count — with no second figure column rendered anywhere

#### Scenario: One modal's columns do not leak into another
- **WHEN** the user opens the Archetypes modal or the Decks modal
- **THEN** neither reserves a leading date column nor renders any row full-width, and both keep the layout they had before the events modal gained those columns

#### Scenario: Selecting a row applies the filter
- **WHEN** the user selects a row in one of the modals
- **THEN** that filter is applied, the modal closes, and the grid, captions, trending tables, and StatCard strip all reflect the new filter

#### Scenario: The "All" row clears just that filter
- **WHEN** the user selects the first row of a modal ("All events", "All archetypes", or "All tiers")
- **THEN** only that filter returns to its default and any other active filters remain applied

#### Scenario: The active row is marked
- **WHEN** a modal opens while its filter is active
- **THEN** the row matching the current selection is visibly marked as selected

#### Scenario: A modal lists its full dimension regardless of its own filter
- **WHEN** a filter is active and the user opens that filter's own modal
- **THEN** every option for that dimension is still listed — computed over the corpus narrowed by the *other* active filters — so the user can switch to a different option or clear it

#### Scenario: Long lists scroll within the modal
- **WHEN** a modal's list is taller than the viewport allows
- **THEN** the list scrolls inside the modal while the page behind it does not

#### Scenario: Modal is dismissible without choosing
- **WHEN** the user presses Escape, activates the close control, or clicks the overlay outside the modal
- **THEN** the modal closes with no change to the active filters

#### Scenario: Modal is keyboard and screen-reader accessible
- **WHEN** a modal opens
- **THEN** it is announced as a modal dialog with a localized accessible name, focus moves into it, and on close focus returns to the StatCard that opened it

#### Scenario: Available on every viewport
- **WHEN** the dashboard renders on a narrow or a wide viewport
- **THEN** all three StatCards are interactive and their modals behave identically, the tier modal's figure remains legible beside its tier label without the row wrapping onto a second line, and the events modal's date and player-count columns remain legible beside the event name without the row wrapping onto a second line

### Requirement: Filter controls share one state
The sidebar filter selects and the StatCard filter modals SHALL be two entry points to the same event, archetype, and tier selections, never independent copies. A selection made through either entry point SHALL be immediately reflected in the other, and existing filter interactions — the archetype filter taking precedence over the tier filter, and auto-reset of selections that become invalid — SHALL apply identically no matter which entry point made the selection.

#### Scenario: A modal selection updates the sidebar
- **WHEN** the user selects an event, archetype, or tier from a StatCard modal
- **THEN** the matching sidebar select shows that value when the sidebar is next visible

#### Scenario: A sidebar selection updates the modals
- **WHEN** the user sets a filter from the sidebar and then opens the corresponding StatCard modal
- **THEN** that modal marks the sidebar's selection as the active row

#### Scenario: Archetype precedence applies to modal selections
- **WHEN** the user selects an archetype from the Archetypes modal while a tier filter is active and that archetype is outside the selected tier
- **THEN** the tier filter resets to its default exactly as it does for a sidebar selection

### Requirement: Topbar app subtitle

The topbar SHALL display a localized subtitle "MTG Metagame Snapshot" (same text in both locales — it is an MTG proper-noun-style tagline) directly beneath the "Netdeckr" wordmark, styled as secondary/muted text distinct from the wordmark. The subtitle SHALL sit within the topbar logo cluster (not under the format `<h1>` title) and SHALL be provided via react-i18next (`app.subtitle`).

#### Scenario: Subtitle renders under the wordmark
- **WHEN** the dashboard loads
- **THEN** "MTG Metagame Snapshot" is shown directly below the "Netdeckr" wordmark in the topbar

#### Scenario: Subtitle comes from i18n
- **WHEN** the UI language is switched between English and Spanish
- **THEN** the subtitle text is resolved through react-i18next (no hardcoded string) and renders consistently

### Requirement: Language selector placement in the sidebar

The language selector (EN/ES toggle) SHALL be located at the **bottom of the filter sidebar**, after the "Clear filters" control, visually detached from the filter groups (not presented as one of the filters). It SHALL NOT appear in the topbar. The selector SHALL remain fully localized and keyboard-operable, and switching languages SHALL update the UI as before.

#### Scenario: Selector lives at the bottom of the sidebar
- **WHEN** the sidebar is open
- **THEN** the language selector appears below the filter groups and the "Clear filters" control, and no language selector is present in the topbar

#### Scenario: Switching language still works from the sidebar
- **WHEN** the user activates the ES or EN control in the sidebar
- **THEN** the interface language changes accordingly

### Requirement: Mobile format-switcher layout

On narrow (mobile) viewports the topbar SHALL place the format-switcher pills in a **single horizontal row below the logo cluster**. When the pills exceed the viewport width they SHALL scroll horizontally within that row **without displaying a horizontal scrollbar**, and SHALL NOT wrap onto multiple lines. On wider viewports the existing single-row topbar layout is retained.

#### Scenario: Pills sit below the logo on mobile
- **WHEN** the viewport is narrow
- **THEN** the format pills render as one row beneath the logo, not wrapped alongside the format title

#### Scenario: Overflowing pills scroll without a visible scrollbar
- **WHEN** the format pills are wider than the viewport on a narrow screen
- **THEN** the row scrolls horizontally to reveal the remaining pills and no horizontal scrollbar is shown

### Requirement: Mobile StatCard strip layout

On narrow (mobile) viewports the header StatCard strip (Events, Archetypes, Decks) SHALL fit its three cards in a **single row below the format title**, reducing each card's padding, minimum width, and value size as needed rather than wrapping onto additional rows. On wider viewports the existing right-aligned strip is retained.

#### Scenario: Three StatCards fit one row on mobile
- **WHEN** the viewport is narrow
- **THEN** the Events, Archetypes, and Decks StatCards render side by side in a single row below the title without wrapping

