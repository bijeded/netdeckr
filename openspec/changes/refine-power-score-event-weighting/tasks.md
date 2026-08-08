## 1. Size-weight curve

- [x] 1.1 Rewrite `sizeWeight()` in `src/lib/powerScore.ts` per design D1 — linear at or below `SIZE_REF`, `1 + log₂(s / SIZE_REF)` above it — and raise `SIZE_WEIGHT_MAX` to 6.0 per D2. Rewrite the calibration comment block (`powerScore.ts:16-21`), which currently describes a linear-with-cap model, and reframe the cap as a data-sanity guard rather than a calibration limit.
- [x] 1.2 Update `src/lib/powerScore.test.ts` for the new curve: assert continuity at `SIZE_REF` (both branches give 1.0), the fixed increment per doubling, that sub-reference weights are unchanged, and that the guard bound clamps an implausible size. Confirm the existing property tests — documented as independent of the exact constants — still pass unmodified; if any does not, that is a finding to report, not a test to adjust.

## 2. Unranked-event classification

- [x] 2.1 Add an unranked-event predicate to `src/lib/eventSize.ts` (or a sibling module if it fits the file's stated purpose poorly) implementing design D3: no bracket range in any of the event's placements AND no recorded player count. Pure and unit-testable, taking the placements and player count as arguments rather than reaching for data itself.
- [x] 2.2 Unit-test the predicate against all four cases: a flat-run unsized event (unranked), an unsized event with a bracket range (ranked), a sized event with a flat run (ranked), and a sized event with ranges (ranked).
- [x] 2.3 Extend `archetypePowerScore()` with the third index-aligned `unranked?: boolean[]` parameter per D5, applying the flat quality from D4 in place of the placement-derived quality when the flag is set. Preserve the existing index-alignment contract and the comment at `powerScore.ts:115-116` warning against refactoring the loop to the shared helper.
- [x] 2.4 Update the caller that assembles per-archetype placements and sizes so it also supplies the unranked flags, classifying once per event rather than once per deck.
- [x] 2.5 Unit-test that an unranked event contributes no champion-grade finish, that its decks are not dropped, and that metagame share and StatCard totals are unchanged by the classification.

## 3. Verification gate

- [x] 3.1 Write a throwaway script (scratchpad, not committed) that computes tier assignments over the live corpus under three calibrations — current, size-curve change only, unranked handling only — and reports the combined before/after tier diff plus each change's contribution in isolation, per design D1/D4 risk notes.
- [x] 3.2 Report the diff. If it is larger than expected or an archetype moves in a way that looks wrong, stop and bring it to the user before opening the PR — D4's flat-quality constant is the intended tuning knob, and adjusting it changes no spec.

## 4. Ship

- [x] 4.1 Run the full gate: `npm run lint`, `npm run type-check`, `npm run test`, and `cd scraper && pytest` (the scraper is untouched, so it must be unchanged — a failure there is unrelated and worth flagging).
- [x] 4.2 Open the PR on a `task/` branch with the tier diff from 3.2 in the description. **Do not merge**: tier badges are user-visible, so merge exception 1 applies — wait for Vercel-preview confirmation from the user.
