## Context

`ArchetypeCard` stacks absolutely-positioned layers inside a 118px-tall art region: a hue base gradient, a repeating-line texture, the signature-card `<img>` (`objectFit: cover`, `objectPosition: center 18%`), the mana pips (top-left), and the tier badge + trend arrow (top-right). The badges already defend themselves a little (`TierBadge` uses `backdropFilter: blur(4px)` plus a translucent tinted background), but against bright/busy art the contrast collapses and the indicators become hard to read.

## Goals / Non-Goals

**Goals:**
- Keep the tier badge, mana pips, and trend arrow legible over any art.
- Keep the creature art vivid — no flat scrim over the whole image.
- Stay on the design-system vibe (near-black canvas, electric-hue glow).
- Purely visual; no logic, data, or copy changes.

**Non-Goals:**
- No change to tier assignment, trend computation, art selection, or fallback logic.
- No new tokens, dependencies, or layout restructuring.
- Not repositioning the badges.

## Decisions

- **Elliptical vignette, not a flat scrim.** Insert one non-interactive `<div>` (`position: absolute`, `inset: 0`, `pointerEvents: 'none'`) between the art `<img>` and the pip/badge layer, with `background: radial-gradient(ellipse at center, transparent 0 45%, rgba(0,0,0,.5) 100%)`. The ellipse tracks the wide/short card so the center creature stays clear while the four corners — where every indicator lives — darken. `subtle` strength (~0.5 alpha at corners) per the design choice.
- **Overlay also covers the placeholder gradient.** When there is no art the card shows its hue base gradient; the vignette sits above it too. Harmless — it just deepens the corners — and keeps a single code path.
- **Hue-matched glow on the badges.** `TierBadge` gains a `box-shadow` glow in the tier's own color (violet T1, cyan T2, faint neutral T3/Otros), keeping the existing `backdrop-blur`. `TrendIndicator` gains the same treatment in its up/down/flat color. Glow radius/spread tuned at implementation; a faint neutral glow on T3/Otros keeps all badges one family.
- **Stacking order matters.** Overlay must render after the `<img>` but before the pip/badge divs so the badges sit on top of the darkened corner, not under it.

## Risks / Trade-offs

- **Corner art slightly dimmed.** Accepted — legibility of the indicators wins, and `subtle` keeps the loss small. Tunable against the preview deploy if needed.
- **Glow on a light badge tint could bloom.** Kept soft/low-alpha so it reads as a halo, not a smear; verified visually across all five formats' cards.
- **Testability.** These are style-only changes; component tests assert the overlay element is present, non-interactive, and ordered below the badges, and that badges/arrow carry a box-shadow — not exact pixel values (which stay tunable).
