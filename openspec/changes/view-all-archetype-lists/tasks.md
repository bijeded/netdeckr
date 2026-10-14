# Tasks

## 1. URL-backed archetype selection

- [x] 1.1 Add `src/hooks/useArchetypeSelection.ts` per design D1. It reads `?a=` into state, re-reads on `popstate`, and `setArchetype(name, { push })` pushes or replaces history and deletes the param on `null`, preserving `?f=`/`?w=`. Add `useArchetypeSelection.test.tsx` covering read-on-load, push vs. replace, removal, `popstate` sync, and a `4/5C Control` round-trip. Verify with `npm run test`.
- [x] 1.2 Swap `App.tsx`'s `archetypeName` `useState` for the hook, thread `{ push }` through `selectArchetype`, and make the format-reset effect skip mount and the archetype auto-reset effect wait for `!loading` (design D3). In `App.test.tsx`, cover: a valid `?a=` deep link isolates after load; an unknown `?a=` resets silently and leaves the URL; format switch, Clear filters, and Reset remove `?a=`; a window switch that drops the archetype removes `?a=`; sidebar selection replaces rather than pushes; a reload keeps the archetype but not event, size, or tier. Verify with `npm run test`, `npm run type-check`, and `npm run lint`.

## 2. "View all lists →" control

- [x] 2.1 Add `decks.viewAll` and `decks.viewAllLabel` to `src/locales/en.json` and `es.json` (design D4). Verify that `src/locales/parity.test.ts` passes.
- [x] 2.2 Render the control in the expanded card's deck-list header in `App.tsx`. Show it only when the card is not isolated. Use the window-pill treatment (design D5) with a touch target of at least 32px. On activation, call `selectArchetype(name, { push: true })` and scroll `.app-main` to the top, honoring `prefers-reduced-motion`. In `App.test.tsx`, cover: the control appears on an expanded card and not on an isolated one; activating it isolates the archetype with the dropdown and caption updated and `?a=` pushed; history Back returns to the grid. Verify with `npm run test`, `npm run type-check`, and `npm run lint`.

## 3. Preview feedback round 1

- [x] 3.1 Move the "View all lists →" pill on mobile: keep the heading and count on one row, and give the pill its own full-width row at ≤640px (design D5, superseded note). Verify the desktop row is unchanged and the existing control tests pass with `npm run test`.
- [x] 3.2 Add the "← Back" control to the isolated view (design D6): `leaveArchetype` in `useArchetypeSelection` (tagged push entry goes `history.back()`, otherwise clears in place), the button beside Reset, `filters.back` / `filters.backLabel` in ES/EN. Cover the hook paths and the App behavior (only when isolated; keeps other filters; history step-back after the pill). Verify with `npm run test`, `npm run type-check`, and `npm run lint`.

## 4. Preview feedback round 2

- [x] 4.1 Move "← Back" from the caption row into the isolated card's deck-list header slot that "View all lists →" uses, in the pill treatment (design D6, superseded note). Verify with the App test asserting Back sits in the isolated card's deck list, plus `npm run test`, `npm run type-check`, and `npm run lint`.

## 5. Preview confirmation (user-visible: merge exception 1)

- [ ] 5.1 Open the PR and, on the Vercel preview, confirm at desktop and ~360px widths: the pill reads as more prominent than the "go to deck →" links; the count and pill fit the header row; Back/Forward, the "← Back" control, and a shared `?a=` link behave as specified. Record the confirmed treatment, or any adjusted border/fill alpha, in design.md D5 as a superseding note. Done when the user has confirmed on the preview.

## Workflow follow-up

- During `/opsx:sync`, retitle by hand in the main specs the two scenarios the validator forced to keep stale titles (design, Risks): "Fall back to the latest 4 lists when there are no top finishes" → "…latest 6 lists…" in `archetype-decklists-view`, and "Filters do not persist across reloads" → "Non-archetype filters do not persist across reloads" in `metagame-breakdown-view`.
- Merge only after the user confirms the preview (CLAUDE.md exception 1), then archive.
