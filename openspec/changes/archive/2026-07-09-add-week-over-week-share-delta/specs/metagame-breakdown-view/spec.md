## ADDED Requirements

### Requirement: Period-over-period metagame-share delta
Each displayed archetype card SHALL show a **share delta indicator** — an up ▲, down ▼, or flat – arrow **together with a signed numeric value** — reflecting how the archetype's **metagame share** in the selected window compares to its share in the **immediately-preceding, equal-length** window, both slices sourced from the retained deck corpus (within the 30-day retention). The preceding window SHALL be the equal-length period ending where the selected window begins:
- For **Last 5 Days**, the selected slice is the most recent 5 days and the preceding slice is the 5 days before it.
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
- **WHEN** the Last 5 Days window is selected and a card displays the recent-window performance trend arrow
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
