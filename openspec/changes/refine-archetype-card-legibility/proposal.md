## Why

The archetype card's tier badge, mana color-identity pips, and trend arrow sit directly on top of the signature-card art. Against bright or busy art (e.g. Izzet Lesson's yellow wall, Mono Green Landfall's tan bears) the badges lose contrast and become hard to read — the exact information the badges exist to convey. The art should still be enjoyable, but the overlaid indicators must always be legible.

## What Changes

- Add a non-interactive **elliptical vignette overlay** over the archetype card art — near-transparent through the center, darkening toward the edges/corners where the pips and badges sit — so the creature art stays vivid while the corners give the badges a legible backdrop.
- Give the **tier badge** and **trend arrow** a hue-matched **glow** (soft colored shadow — violet for T1, cyan for T2, a faint neutral for T3/Otros, and the up/down/flat color for the trend) so they read as self-lit against any art.
- No changes to logic, data, tier assignment, trend computation, or copy — this is purely a visual/legibility refinement.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds a legibility requirement — the archetype card's overlaid indicators (tier badge, color-identity pips, trend arrow) must remain readable regardless of the underlying signature-card art.

## Impact

- `src/components/ArchetypeCard.tsx` — insert the vignette overlay div between the art image and the pip/badge layer (non-interactive, `pointerEvents: none`).
- `src/components/TierBadge.tsx` — add the hue-matched glow.
- `src/components/TrendIndicator.tsx` — add the matching glow.
- Component tests for the above; no data, hook, i18n, or scraper impact.
