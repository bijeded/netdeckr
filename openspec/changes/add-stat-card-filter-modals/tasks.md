## 1. Copy and shared foundations

- [x] 1.1 Add the new i18n keys to `src/locales/es` and `src/locales/en`: the three modal titles, the modal close label, the row-count/share row copy, and the main-window `Reset` label. Reuse the existing `filters.allEvents` / `filters.allArchetypes` / `filters.allTiers` and tier labels rather than duplicating them.
- [x] 1.2 Build the generic filter-modal component (rows + selection + localized title), following `DecklistModal`'s dialog behavior: overlay, `role="dialog"`, `aria-modal`, Escape and overlay-click to close, focus moved in on open and restored to the trigger on close. Its list scrolls inside the modal. Add its CSS to `src/styles/dashboard.css`.
- [x] 1.3 Unit-test the modal component in isolation: renders its rows, marks the active row, calls back with the chosen value, closes on Escape / overlay / close control without changing anything, and restores focus to the trigger.

## 2. Interactive StatCards

- [x] 2.1 Give `StatCard` an interactive variant: a real button with `aria-haspopup="dialog"`, `aria-expanded`, a visible focus indicator, and an optional active-filter line under the label that truncates rather than wrapping. Non-interactive usage must render exactly as today.
- [x] 2.2 Update `StatCard.test.tsx` for both variants — including that an unfiltered card renders no extra line, and that the active-filter line truncates instead of growing the card.

## 3. Wiring the three filters

- [x] 3.1 In `App.tsx`, hold which-modal-is-open state and wire each StatCard to its modal, with each modal writing to the existing `setEventId` / `setArchetypeName` / `setTier` — no duplicate filter state.
- [x] 3.2 Build each modal's rows from data already computed in `App.tsx`: events with name, abbreviated date (via the shared `eventLabel` helper) and deck count; archetypes share-descending with pips, name, share and tier; the four tiers with badge, localized label and deck count.
- [x] 3.3 Implement the "computes its rows over the corpus narrowed by the *other* active filters, never its own" rule from design.md, so a filter's own modal always lists every option and switching or clearing stays possible.
- [x] 3.4 Verify in tests that a modal selection and the equivalent sidebar selection produce identical state — including that choosing an archetype outside the active tier resets the tier from either entry point.

## 4. Main-window Reset

- [x] 4.1 Add the `Reset` control right-aligned on the grid caption row, sharing one clear handler with the sidebar `ClearFiltersButton`, always rendered and disabled when no filter is active. Add the caption-row layout rules for desktop and narrow viewports.
- [x] 4.2 Test that Reset clears all three filters, is disabled with none active, keeps its place in the layout when the filter state toggles, and is present without opening the sidebar at narrow widths.

## 5. Verify

- [x] 5.1 Run `npm run lint`, `npm run type-check`, and `npm run test`. The scraper is untouched, so `pytest` is unaffected.
- [ ] 5.2 Open the PR and confirm on the Vercel preview, at both desktop and phone widths: Reset placement and its disabled weight on the caption row, the focus ring on the StatCards, the active-filter line's truncation with a long event name, the tier modal alongside the tier badges in the grid, and that the archetype-resets-tier behavior does not read as a glitch. Record the settled values back into design.md. Do not merge before this confirmation — this is a user-visible change.
