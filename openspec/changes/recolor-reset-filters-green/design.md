## Context

See proposal.md — Why. The control is `.reset-filters` in `src/styles/dashboard.css`, rendered by a plain `<button>` in `src/App.tsx` on the grid caption row; all of its appearance lives in CSS, none in the component. Three states are styled today: base (enabled), `:hover:not(:disabled)`, and `:disabled`.

The constraint that shapes the approach is the neighborhood, not the button. Two things sit next to it:

- The grid caption immediately to its left is `--neon-text-soft` — the same violet family as the control's current accent.
- The archetype grid immediately below renders ShareDelta pills (`src/components/ShareDelta.tsx`) whose recipe is `--up-tint` fill + `--up-border` border + `--up` text on a small rounded pill — structurally identical to this control's.

So the design has to move away from violet without landing on the trend greens.

## Goals / Non-Goals

**Goals:**
- Pick a concrete green and express it as reusable tokens rather than one-off rgba literals.
- Keep the three states' contrast relationship intact: enabled reads as an action, disabled recedes.
- Leave the DOM, the component, and the enabled/disabled logic untouched.

**Non-Goals:**
- Any change to the sidebar `ClearFiltersButton`. It stays neutral; a second green control on screen was not asked for and would re-create the "which one is the action" problem in a new place.
- Changing the control's size, radius, padding, position, or font weight. This is a hue change only — the layout is load-bearing (the button is rendered-but-disabled specifically so the grid below never shifts).
- Introducing a general "success" or "safe action" color role for the design system. This is one control.

## Decisions

**Use the existing `--mana-g` (#43a05c) as the base hue, not `--up` (#2fe6a0).**
`--up` is unavailable for the reason recorded in the spec: with `--up-tint` and `--up-border` it is the exact fill/border/text recipe of the ShareDelta rising pill, so a control using it would be a metric look-alike one row above a grid of real ones. `--mana-g` is a distinctly more subdued green already in `src/styles/tokens/colors.css`, and its only current consumer is `ManaPips.tsx`, which renders ~8px circles — a different silhouette, so reuse does not create a second collision. Alternative considered and rejected: minting a brand-new green token, which would add a fourth green to a palette that already carries `--up`, `--mana-g`, and `--live`.

**Express the tint and border as new tokens (`--mana-g-tint`, `--mana-g-border`) alongside `--mana-g`.**
Follows the established pattern — every accent that is used as a fill/border/text triad in this palette (`--up`, `--down`, `--flat`, `--neon`) already has `-tint` / `-border` siblings. Alternative considered: inline `rgba(67,160,92,...)` literals in `dashboard.css`, rejected because it hardcodes the hue in a second place and breaks the palette's convention.

**Opacity targets follow the ShareDelta/neon precedent, and the exact values are settled on the preview.**
Starting points, chosen to match the existing triads rather than derived from anything: tint near `.12` (matching `--up-tint`), border near `.4`–`.45` (matching `--up-border`). *Calculated:* `#43a05c` as text over the resulting tinted ground is ≈5.1:1, clearing the 4.5:1 floor. *Pending visual confirmation:* whether the subdued green at these opacities still reads as an available action rather than a disabled one — that is the specific failure mode of a muted accent, and it is an eye question, not a math one. The confirmed values get recorded here after the preview.

**Replace the hover glow rather than dropping it.**
`.reset-filters:hover:not(:disabled)` currently hardcodes `--neon-glow` (a violet `box-shadow`) and lifts text to `--neon-text-soft`. Green needs a matching pair: a green-tinted glow and a lifted green text value. *Pending visual confirmation:* whether a subdued green supports a glow at all — `--neon-glow` works because the violet is high-chroma, and #43a05c may simply look dirty rather than lit. Falling back to a tint/border step-up with no glow is an acceptable outcome; the spec requires distinguishability, not a glow.

**Leave `:disabled` as-is.**
It already drops all accent to `--border-line` / `--text-faint` / `opacity .5`, which is exactly what the spec now requires ("no accent hue at all"). No edit needed — and specifically, the new green must not be introduced into the disabled rule as a faded variant, which is the tempting-but-wrong version of this change.

## Risks / Trade-offs

- **A subdued green reads as disabled rather than available** → The whole point of the control is that its enabled state is obvious. Mitigated by confirming on the Vercel preview with a filter applied, side by side with the disabled state; if it fails, the fallback is raising the border opacity before raising the fill, since the border is what carries "interactive" at this size.
- **`--mana-g` acquires a second meaning** → It currently means "green mana" and nothing else. After this it also tints one control. Accepted: the two uses never appear in the same component, and the shapes differ (pip vs pill). If a third, unrelated use appears later, that is the point to split out a dedicated token.
- **Green still groups with the trend indicators at a glance, despite the different green** → Lower risk than `--up` but not zero; two greens in one viewport is still two greens. This is exactly what the "does not read as a metric" scenario is there to check on the preview.
- **No automated test can catch a regression here** → Nothing in the repo asserts on computed color, and the existing `ClearFiltersButton.test.tsx` / App tests cover behavior, not appearance. The preview check is the only gate, which is why this is a merge exception 1.

## Confirmed on the preview

Checked on the PR #198 Vercel preview with a filter applied, and confirmed by the user. The values below are settled, not provisional:

- Fill `--mana-g-tint: rgba(67,160,92,.12)`, border `--mana-g-border: rgba(67,160,92,.45)`.
- Hover: `--mana-g-tint-strong: rgba(67,160,92,.18)`, text lifted to `--mana-g-text-soft: #7fce95`, and the glow **survives** — `--mana-g-glow: 0 0 14px rgba(67,160,92,.22)`. The concern that a subdued green could not carry a glow did not materialize.
- The enabled control reads as an available action, does not group with the ShareDelta pills below, and separates from the violet caption beside it. These were the three questions the design could not answer by calculation; all three are now confirmed visually.

This section supersedes the design's original Open Questions (exact tint/border opacities, and whether the hover keeps a glow), which are now answered.
