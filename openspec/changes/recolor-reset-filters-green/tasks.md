## 1. Tokens

- [x] 1.1 Add `--mana-g-tint` and `--mana-g-border` beside `--mana-g` in `src/styles/tokens/colors.css`, following the `--up` / `--down` / `--flat` triad convention, at the starting opacities recorded in design.md (~.12 fill, ~.4–.45 border). Add the lifted hover text value in the same pass if the hover keeps a colored text step.

## 2. Control restyle

- [x] 2.1 Recolor `.reset-filters` and `.reset-filters:hover:not(:disabled)` in `src/styles/dashboard.css` from the violet accent to the new green tokens, replacing the hardcoded `--neon-glow` in the hover rule. Leave `.reset-filters:disabled` untouched — it already carries no accent — and leave the size, radius, padding, position, and font weight unchanged. This is one coherent edit; do not split it per rule.

## 3. Verification

- [x] 3.1 Run `npm run lint`, `npm run type-check`, and `npm run test`; confirm the existing App and `ClearFiltersButton` tests still pass (they assert behavior, not color, so they should be unaffected — a failure here means something beyond the restyle moved).
- [x] 3.2 Open the PR and check the Vercel preview with a filter applied: the enabled Reset reads as an available action, is clearly distinct from the disabled state, does not group with the ShareDelta pills in the grid below, and separates from the violet caption beside it. Confirm the hover step is visible and decide whether the glow survives.
- [x] 3.3 Record the confirmed opacity values and the hover-glow outcome in design.md, replacing its Open Questions section.

## 4. Merge

- [ ] 4.1 This is a user-visible change (CLAUDE.md merge exception 1) — hold for the user's confirmation from the preview before merging, then merge and delete the branch.
