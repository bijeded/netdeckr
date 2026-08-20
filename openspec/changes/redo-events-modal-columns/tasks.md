## 1. Extend the shared FilterModal

- [x] 1.1 Add `lead?: ReactNode` and `fullWidth?: boolean` to `FilterModalRow`, and render them in `FilterModal`: reserve the leading column list-wide when any row supplies `lead` (matching the existing `hasAside` / `hasMetaSecondary` treatment), and render a `fullWidth` row as `content` alone across the row, skipping every column cell. Document both fields in the same voice as the existing ones.
- [x] 1.2 Add the two CSS rules to `dashboard.css` beside the existing `.filter-modal-row-*` set — a fixed-width leading cell and a full-width row — leaving the name column as the one that flexes and ellipsizes. Use a provisional lead width; the confirmed value is set in task 4.2.
- [x] 1.3 Extend `FilterModal.test.tsx` to cover the two new fields, and confirm its existing tier and archetype cases still pass unchanged — that is the guard that the other two modals are untouched.

## 2. Rebuild the events rows

- [x] 2.1 Replace `eventRows` in `App.tsx`: the "All events" row becomes `fullWidth`, and each event row becomes `lead` (abbreviated date, em dash when the date is unrecorded), `content` (event name), `meta` (player count via the existing `dashboard.eventSize` key, em dash when the count is absent or not positive). Remove the now-unused `decks` helper and `windowDecks`.
- [x] 2.2 Confirm `eventLabel.ts` is untouched and still used by the header caption and the sidebar `EventSelector` — the modal is its only removed caller.

## 3. Tests and checks

- [x] 3.1 Update the Events-modal assertions in `App.test.tsx` to the three-column rows, and add cases for an event with no player count, an event with no date, and the full-width "All events" row.
- [x] 3.2 Run `npm run lint`, `npm run type-check`, and `npm run test` clean. Lint and type-check are what confirm the `decks` / `windowDecks` removal left nothing dangling.

## 4. Review revisions

- [x] 4.1 Replace the em dash with a localized word — `filters.unknownFact` ("Unknown" / "Desconocido") — in both the date and player-count cells, and drop the planned `aria-label`: the visible text now carries the meaning.
- [x] 4.2 Delete `metaSecondary` from `FilterModal`, its CSS, and its tests, and correct the spec's tier scenarios to the single-figure behavior the app already had.

## 5. Visual confirmation

- [x] 5.1 Open the PR and check the Events modal on the Vercel preview at a wide and a narrow viewport: rows do not wrap, the three columns form clean vertical bands, and a long event name ellipsizes rather than pushing the player count out of line.
- [x] 5.2 Confirm the date column's provisional 84px against the preview — it is sized for "Desconocido", not for a date — and record the settled value in `design.md`.
- [x] 5.3 Hold for the user's confirmation on the preview before merging — this is merge-rule exception 1 (user-visible change, no staging environment).
