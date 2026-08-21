## Why

The main-window "Reset" control on the grid caption row is styled in the primary violet accent (`--neon-border` / `--neon-tint-16` / `--neon-text`). It sits immediately beside a grid caption that is itself violet (`--neon-text-soft`), so the enabled state does not read as a distinct, available action — it blends into the caption row it is supposed to stand out from.

## What Changes

- Recolor the **enabled** state of the main-window Reset control from the violet accent to a subdued green based on the existing `--mana-g` (#43a05c) token — a tinted fill, a tinted border, and green text, keeping the control's current size, shape, and position.
- Retune the hover state, which currently hardcodes the violet `--neon-glow`, to a matching green treatment.
- Keep the **disabled** state explicitly neutral (muted text, hairline border, no accent) rather than deriving it as a faded version of the new green, so the enabled/disabled contrast does not weaken.
- Deliberately avoid `--up` (#2fe6a0): that token, with `--up-tint` and `--up-border`, is the exact fill/border/text recipe of the ShareDelta "rising" pills rendered on the archetype cards directly below this row. A control using it would be visually indistinguishable from a metric. `--mana-g` is a distinct, more subdued green whose only current use is the circular mana pips, a different silhouette.
- The sidebar "Clear filters" control is **out of scope** — it stays neutral.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: the "Clearing filters" requirement already states that the enabled main-window Reset control must read as an available action and be distinguishable from its disabled state. It gains the further constraint that the enabled treatment must also be distinguishable from the metagame's data indicators — it must not reuse the share-delta trend colors or read as a metric.

## Impact

- **Affected code**: `src/styles/dashboard.css` (`.reset-filters`, `.reset-filters:hover:not(:disabled)`, `.reset-filters:disabled`). Possibly one or two new tint/border tokens in `src/styles/tokens/colors.css` if the green tint and border are expressed as tokens rather than inline rgba.
- **Blast radius**: one control, presentation only. No change to `App.tsx` behavior, the `clearFilters` handler, the enabled/disabled logic, or any i18n string.
- **Not affected**: Supabase tables and RLS policies, scraper behavior, the 7days/2weeks time-window model, the 30-day retention window.
- **User-visible**: yes. Per CLAUDE.md this is a merge exception 1 — it needs confirmation on the Vercel preview before merging.
- **Accessibility**: #43a05c as text over the tinted ground is ~5.1:1, clearing 4.5:1. The final values are confirmed on the preview, not from local reasoning alone.
