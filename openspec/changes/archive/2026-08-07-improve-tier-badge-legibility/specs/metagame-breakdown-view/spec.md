## MODIFIED Requirements

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

#### Scenario: Vignette darkens the badge corners
- **WHEN** an archetype card renders its signature-card art
- **THEN** a non-interactive overlay darkens the art toward its edges and corners while leaving the center near-transparent, so the art stays visible and the mana pips have a legible backdrop

#### Scenario: Mana pips stay distinguishable over bright art
- **WHEN** the color-identity mana pips render over bright or busy art
- **THEN** each pip's color remains distinguishable from its neighbours and from the art behind it

#### Scenario: Overlay does not intercept interaction
- **WHEN** the user clicks anywhere on the card art region
- **THEN** the vignette overlay does not intercept the click, and the card's expand/collapse behavior is unchanged

#### Scenario: Tier badge and trend arrow are self-lit
- **WHEN** the tier badge or trend arrow renders over the art
- **THEN** each carries a glow in its own color (tier hue for the badge, up/down/flat color for the trend arrow) so it reads as legible even against art of a similar tone

#### Scenario: Badge and trend arrow hold equal weight
- **WHEN** an archetype card renders both a tier badge and a trend arrow
- **THEN** the two chips read as equally prominent, sharing the same backdrop treatment and comparable size

## ADDED Requirements

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
