# Tasks

## 1. Stock list module

- [x] 1.1 Trim `src/lib/stockList.ts` per design Decision 1: remove `ConsensusRow`, `ConsensusBand`, `bandOf`, `CORE_MIN_PCT`, `FLEX_MIN_PCT`, the `consensus` / `sideboardPlan` result fields, `toRow`, and `RankedCard.decks`; keep `avgCopies` as the ranking tie-breaker; update the module header comment so it no longer mentions consensus tables. In `stockList.test.ts`, drop the `bandOf` and `result.consensus` assertions, keeping or rewriting their ranking checks against `result.main` / `result.side`. Verify: `npm run test -- stockList` passes with the `main` / `side` assertions unchanged.

## 2. Analysis tab UI

- [x] 2.1 Remove the tables from the tab (design Decisions 2–3): in `ArchetypeAnalysis.tsx`, drop the `.analysis-two-col` block with both `ConsensusTable`s and the `composition-pending` fallback; delete `src/components/ConsensusTable.tsx`. In `ArchetypeAnalysis.test.tsx`, delete the banding, paging and page-reset tests; remove `consensus-table` / `sideboard-plan` from the small-sample test's id list; change the card-data error test to expect the message once, inside `stock-list`; add an assertion that neither `consensus-table` nor `sideboard-plan` renders. Verify: `npm run test -- ArchetypeAnalysis` and `npm run type-check` pass.
- [x] 2.2 Remove the styles and tokens (design Decisions 4–5): delete `.analysis-two-col` (base rule and ≤ 960px query), `.analysis-table*`, `.analysis-band-*`, `.analysis-card-cell` and `.analysis-pager*` from `dashboard.css`, keeping the ≤ 640px `.analysis-panel-body` padding outside the removed block; in `colors.css`, delete `--band-core` / `--band-spicy`, rename `--band-flex` to `--funnel-accent` (`#7fd8ff`, with a comment saying it is for the performance funnel), and point `.analysis-bar-finish` at it. Verify: `grep -rnE "band-(core|flex|spicy)|analysis-(two-col|table|band|card-cell|pager)" src` returns nothing.
- [x] 2.3 Remove the unused copy (design Decision 6): delete `analysis.composition.{consensusTitle, sideboardTitle, card, played, bands, pagerLabel, prevPage, nextPage, pageOf}` from `en.json` and `es.json`, keeping `cards_one` / `cards_other`. Verify: `grep -rnE "composition\.(consensusTitle|sideboardTitle|card|played|bands|pagerLabel|prevPage|nextPage|pageOf)\b" src` returns nothing, and both locale files still have the same `analysis` key set.

## 3. How It Works page

- [x] 3.1 Remove the Consensus/Consenso and Sideboard plan items from the Analysis tab section in `howItWorks.en.ts` and `howItWorks.es.ts`. In `howItWorks.test.ts`, drop the `parts.consensus` threshold assertions and add one that the section mentions neither the Core/Flex/Spicy bands nor the sideboard plan in either locale (spec "Bands and wildcards are explained"). Verify: `npm run test -- howItWorks` passes, including the same-structure test across locales.

## 4. Integration

- [x] 4.1 Run the CI checks locally: `rtk proxy npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`. Verify all four pass. The scraper is untouched, so `pytest` is not needed.
- [x] 4.2 Open the PR and confirm on the Vercel preview (CLAUDE.md merge exception 1) that the Analysis tab shows no Consensus or Sideboard Plan table, the performance funnel bar looks unchanged, and the tab's end spacing looks right on desktop and mobile. Record the outcome in design.md (Decision 3, which is pending visual confirmation). Verify: the user confirms the preview.

## Workflow follow-up

- Merge only after the user confirms the preview (exception 1).
- Sync the delta specs into `openspec/specs/` and archive the change.
