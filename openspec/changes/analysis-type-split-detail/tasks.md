# Tasks

## 1. Card-type classification

- [x] 1.1 Add `CardType` and `cardType(typeLine)` to `src/lib/cardType.ts` with the Land > Creature > Planeswalker > Battle > Artifact > Enchantment > Instant > Sorcery > Other precedence, matching only the type portion before ` — `; extend `src/lib/cardType.test.ts` with each single type, Land Creature, Artifact Creature, Enchantment Land, Artifact Enchantment, Kindred Sorcery, a subtype-only word (e.g. "Artifact — Equipment"), and a null type line, and verify `npm run test` passes with existing `cardCategory` tests unchanged
- [x] 1.2 Switch `typeSplit()` in `src/lib/archetypeAnalysis.ts` to `cardType()` in the nine-type display order; update its test in `src/lib/archetypeAnalysis.test.ts` to the spec's 60-card scenario (sums to 60, zero battles and other), and verify `manaCurve` and stock list tests still pass untouched

## 2. Doughnut rendering and copy

- [x] 2.1 Add `--type-*` colour tokens to `src/styles/tokens/colors.css` (lands `--text-muted`, creatures `--neon-500`, six new hues avoiding `--up`/`--down`/`--flat`), validated for contrast against `--surface-card` and adjacent-slice separation with the dataviz validator; point `TYPE_COLOR` in `CompositionRail.tsx` and the `.analysis-type-*` classes in `src/styles/dashboard.css` at them, and verify both reference the same tokens
- [x] 2.2 Add `analysis.composition.types.*` labels (nine keys) to `src/locales/en.json` and `src/locales/es.json`, switch the legend from `modal.group.*` to them, and change ES `analysis.composition.sideboardTitle` to "Plan de sideboard"; update `src/components/ArchetypeAnalysis.test.tsx` type-split assertions to the new labels, and verify `npm run test` passes
- [x] 2.3 Run `rtk proxy npm run lint`, `npm run type-check`, and `npm run test`, and verify all pass

## 3. Preview confirmation

- [ ] 3.1 Open the PR, confirm on the Vercel preview the doughnut colours, the legend at its tallest real archetype, the unchanged stock list grouping, and the Spanish "Plan de sideboard" heading; record the confirmed colour values and legend layout in `design.md`

## Workflow follow-up

- Merge only after the user confirms the Vercel preview (user-visible change).
- Sync specs and archive the change after merge.
