## 1. Toggle behavior

- [x] 1.1 Add the localized action string for the pill's accessible name to `src/locales/en.json` and `src/locales/es.json` (interpolating the other window's label), and verify both files stay valid JSON with matching key sets
- [x] 1.2 Turn the `window-pill` element in `src/App.tsx` into a `<button type="button">` that calls `setWindow` with the other of the two windows, renders the current window's label with its directional glyph (`Last 7 days →` / `← Last 2 weeks`), carries the action in `aria-label`, and sets no `aria-pressed`; verify `npm run type-check` passes and the three existing `window-pill` assertions in `src/App.test.tsx` still pass

## 2. Control affordance

- [x] 2.1 Add the pill's modifier class to `src/styles/dashboard.css` following the `.stat-card--button` pattern — `font: inherit`, `cursor: pointer`, a hover step, no `outline: none` so the UA focus ring survives — and move the pill's existing inline neon-tint styling onto it; verify `npm run lint` passes and the pill still renders with its rest-state look

## 3. Coverage

- [x] 3.1 Extend `src/App.test.tsx` with the toggle cases from the spec: activating the pill widens 7 days → 2 weeks and narrows 2 weeks → 7 days (label and glyph follow), the sidebar `WindowSelector` reflects the same window afterwards, `?w=` is updated, and the accessible name names the action rather than the state; verify `npm run test` passes

## 4. Visual confirmation

- [ ] 4.1 Open the Vercel preview and confirm the two items design.md marks pending: whether the glyph flip's one-glyph shift of the label's left edge reads as jumpy next to the `<h1>` (fallback: fixed trailing `→`), and whether the hover step is visible against the pill's existing neon tint; record the settled values in design.md
- [ ] 4.2 Confirm the pill on a phone-width viewport — it reads as interactive without hover, and the title row still reflows cleanly with the StatCard strip
