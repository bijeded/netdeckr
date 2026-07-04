## ADDED Requirements

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
