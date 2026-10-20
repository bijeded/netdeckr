# Tasks

## 1. How It Works copy

- [x] 1.1 Add the Analysis tab section (heading, scope paragraph, one bullet per part) to `src/content/legal/howItWorks.en.ts` and `howItWorks.es.ts` per design.md, and extend `src/content/legal/howItWorks.test.ts` to check each part's leading term, the band thresholds, the 5-deck small sample, Standard/Pioneer for wildcards, and 2 weeks in the scope paragraph, in both locales; verify `npm run test` passes, including the unchanged `parity.test.ts`

## 2. Analysis tests and comment

- [x] 2.1 Add a test to `src/components/ArchetypeAnalysis.test.tsx` that pages the consensus table to 2 / 3, rerenders with another archetype's rows, and expects page 1 in the consensus table and sideboard plan; add `toHaveClass('view-all-pill--analysis')` to the "Analysis →" test in `src/App.test.tsx`; update the `.view-all-pill--analysis` comment in `src/styles/dashboard.css` to say it was confirmed on the PR #220 preview; verify `npm run test` passes
- [x] 2.2 Run `rtk proxy npm run lint`, `npm run type-check`, and `npm run test`, and verify all pass

## 3. Preview confirmation

- [x] 3.1 Open the PR, confirm the How It Works page in both locales on the Vercel preview (section placement, bullet wording, length on a phone), and record the outcome in `design.md`

## Workflow follow-up

- Merge only after the user confirms the Vercel preview (user-visible change).
- Sync specs and archive the change after merge.
