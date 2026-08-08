## 1. Copy

- [x] 1.1 Add the count-aware archetype-count strings (`_one`/`_other`) to the filters section of both `src/locales/en.json` and `src/locales/es.json`, alongside the existing deck-count pair

## 2. Shared modal column

- [x] 2.1 Add the optional second figure field to the `FilterModalRow` shape and render it as its own cell to the left of `meta`, reserved list-wide by the same rule that governs `aside` — with the CSS for the two figure columns in `src/styles/dashboard.css`, using provisional minimum widths to be settled in task 4.1

## 3. Tier rows

- [x] 3.1 Populate the archetype figure on every tier row in `src/App.tsx` — the four tier rows from the breakdown filtered by tier, and the "All tiers" row from the whole breakdown — leaving the existing deck figures unchanged
- [x] 3.2 Update the modal-row comment block in `src/App.tsx` so it reflects that the tier rows now carry two units

## 4. Verification

- [x] 4.1 Confirm on the Vercel preview that the two figure columns align down the list and that a tier row does not wrap at the narrowest supported width, in both locales; adjust the column minimum widths if needed and record the settled values in design.md
- [x] 4.2 Extend the modal tests to cover the tier rows carrying both figures and the Events/Archetypes modals rendering no extra empty cell, and run `npm run lint`, `npm run type-check`, and `npm run test`
