# Tasks

## 1. Verify the split

- [x] 1.1 Run `openspec validate split-card-type-split-requirement --strict` and verify it passes with no description-length warning
- [x] 1.2 Cover each added scenario with a test: add a `typeSplit` test in `src/lib/archetypeAnalysis.test.ts` where multi-type cards (Enchantment Land, Artifact Creature, Enchantment Creature) sit in a 60-card mainboard and the split totals 60; Enchantment Creature counts as a creature is covered by the `cardType` precedence test in `src/lib/cardType.test.ts`; empty types left out of the legend by the type-split assertion in `src/components/ArchetypeAnalysis.test.tsx`. Verify `npm run test` passes

## Workflow follow-up

- Sync specs, then verify `openspec validate archetype-analysis --type spec` reports no warnings.
- Archive the change.
