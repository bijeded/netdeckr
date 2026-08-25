## Context

See proposal.md — Why. Current state: the pill is an inline-styled `<span data-testid="window-pill">` on the format-header row in `src/App.tsx`, rendering `windowLabel` (derived from `WINDOWS` + `metaWindow`). The window itself already lives in `useWindowSelection` (`?w=` param, `setWindow`), which the sidebar `WindowSelector` drives. Nothing about the data path changes: the window is a client-side date filter over an already-fetched 28-day corpus, so a swap re-derives in place with no refetch.

Two existing conventions constrain the styling: the neighbouring StatCards moved from static box to control by adding a `--button` modifier class with `cursor` + `:hover` (`src/styles/dashboard.css:73`), and the codebase defines no custom focus styles anywhere — every control relies on the user agent's focus ring.

## Goals / Non-Goals

Goals
- One control, one source of truth: the pill calls the same `setWindow` the sidebar does, so sync is structural rather than something to maintain.
- Keep the visible label a statement of state; put the action in the accessible name.

Non-Goals
- Generalizing to more than two windows. This is a swap, not a cycler; a third window would require revisiting the control, and none is planned.
- Touching the sidebar `WindowSelector`, the `WINDOWS` model, or the URL contract.
- A promoted/segmented two-up switch showing both windows at once — considered and rejected below.

## Decisions

**Swap, not a menu or a segmented switch.** With exactly two windows, `next = current === '7days' ? '2weeks' : '7days'` is unambiguous and costs no extra width on phones, which is the case the change exists for. A segmented two-up control would show both options at once (more discoverable) but roughly doubles the pill's width right next to the `<h1>` and duplicates the sidebar group's job. Rejected on width.

**Direction derived from the window, not hardcoded per label.** The two windows are nested (7 days ⊂ 2 weeks), so the glyph means something: `→` trailing while narrow (activation widens), `←` leading while wide (activation narrows back). Alternative considered: a fixed trailing `→` in both states, which avoids the label's left edge shifting by one glyph when it flips. Chosen against, deliberately — the directional cue is the point; the shift is one glyph on a row that already reflows. Whether that shift reads as jumpy next to the title is **pending visual confirmation on the Vercel preview**; if it does, the fallback is the fixed trailing `→` and the spec's direction requirement gets revisited.

**Glyphs come from the project's sanctioned set (`→`, `←`).** `▶` is outside it and `▼` would misread as a dropdown.

**`<button>`, no `aria-pressed`.** The element becomes a real `<button type="button">`, so keyboard operation and the focus ring come for free from the platform. `aria-pressed` is omitted on purpose: the control is not an on/off state, it swaps which of two values is live, and a pressed state would announce a toggle that does not exist. The action lives in `aria-label` (new localized key, e.g. `windows.switchTo`, interpolating the *other* window's label), so the accessible name and the visible label deliberately differ.

**Styling by class, not more inline style.** Follow `.stat-card--button`: keep the pill's current neon-tint look, add a modifier class in `dashboard.css` carrying `cursor: pointer`, a hover state, and `font: inherit` (a `<button>` otherwise inherits none of the display font). Do **not** set `outline: none` — the UA focus ring is the app's only focus indicator today, and removing it here would be the one control without one. Exact hover treatment (border/background step) is **pending visual confirmation**; the calculated starting point is the StatCard pattern's `border-color: var(--neon-border)` step, which the pill already uses at rest, so the hover step needs to move something else — likely background tint depth.

**Localization.** `windows.last7Days` / `windows.last2Weeks` already exist and stay the visible label; only the action string is new, in both `es.json` and `en.json`.

## Risks / Trade-offs

- **The glyph flip shifts the label's left edge** → confirm on the preview; fixed trailing `→` is the ready fallback (see Decisions).
- **Two controls for one value could drift** → they cannot: both call the same `setWindow`, and the pill holds no local state.
- **A `<button>` where a `<span>` was may inherit unwanted UA styling (font, padding, background)** → reset explicitly via the modifier class rather than relying on the existing inline styles to win.
- **The pill's new interactivity is invisible at rest** → mitigated by cursor + hover, but on touch there is no hover. The glyph is what carries the affordance on phones; whether it reads as interactive there is **pending visual confirmation**.

## Migration Plan

None. Single-commit UI change, no data or URL contract change; reverting the commit fully restores the static pill. The `?w=` param keeps working for links shared from either before or after.
