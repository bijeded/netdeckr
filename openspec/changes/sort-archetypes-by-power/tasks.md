# Tasks

## 1. Ordering selector

- [x] 1.1 Carry the score and add the selector (design Decisions 1–2). In `src/lib/metagame.ts`, add `powerScore: number` to `ArchetypeShare`, filled by `attachPowerTiers` from its existing `scoreCache`, then add a pure `orderBreakdown(list, order)`. `popular` keeps share order; `power` sorts by tier index, then `powerScore` desc, then `sharePct` desc, then `name` asc. Both renumber `rank` 1..N. Add `src/lib/sortOrder.ts` with the `SortOrder` type, `DEFAULT_SORT_ORDER`, and `normalizeSortOrder` (unknown → `popular`), mirroring `windows.ts`. In `metagame.test.ts`, cover:
  - tier precedence over score, including a T2 archetype demoted by the Tier 1 floor despite a higher score;
  - the score order within a tier;
  - the share-then-name tiebreak;
  - rank renumbering in both orders;
  - `attachPowerTiers` returning the same score that sets the tier.

  Add `sortOrder.test.ts` for normalization. Verify: `npm run test -- metagame sortOrder` and `npm run type-check` pass.

## 2. URL-backed sort state

- [x] 2.1 Add `src/hooks/useSortOrder.ts` (design Decision 4), modeled on `useWindowSelection`. It reads `sort` on mount, removes an unknown value silently, follows `popstate`, writes `sort=power` or deletes the param with `replaceState`, and preserves every other param. In `useSortOrder.test.tsx`, cover:
  - default with no param;
  - `sort=power` restoring Power;
  - an unknown value removed from the URL;
  - Popular deleting the param;
  - no history entry added (`history.length` unchanged);
  - other params (`f`, `w`, `a`, `tab`) left intact.

  Verify: `npm run test -- useSortOrder` passes.

## 3. Grid control and wiring

- [x] 3.1 Build the control and wire it into the grid (design Decisions 3, 5, 6). Do not hardcode spacing or sizing values that are pending visual confirmation; start from the existing `.tab-toggle` / `reset-filters` treatments.
  - **Control:** add `src/components/SortOrderToggle.tsx`: two buttons in `role="group"` with a localized `aria-label`, `aria-pressed` on the active one, and a `disabled` prop.
  - **Caption row:** place it before Reset in a right-aligned flex group.
  - **Ordering:** in `App.tsx`, apply `orderBreakdown(breakdown, sortOrder)` before the existing `visibleBreakdown` branches, keep `maxPct` on the highest share (not `ordered[0]`), change the card `key` to `archetype.name`, and disable the control while an archetype is isolated.
  - **Caption:** switch only the default fallback to `dashboard.powerCaption_one` / `_other` under Power.
  - **Copy:** add `dashboard.powerCaption_*` and the control's label strings to `en.json` and `es.json`.
  - **Tests:** in `App.test.tsx` (Supabase hooks mocked, since CI has no env), cover:
    - default Popular order and caption;
    - switching to Power reordering cards without a new fetch;
    - a low-share T1 archetype entering the top 12 and displacing a popular one;
    - the "Top 12 by performance" caption and the fewer-than-12 count;
    - tier filter and event/size filter ordering with their captions unchanged;
    - the control disabled while isolated, with the order restored after Back;
    - Reset / Clear filters keeping Power;
    - Power alone leaving Reset disabled;
    - the order kept across a format and window switch;
    - no Power Score number on any card;
    - an expanded card staying expanded across a toggle.

  Verify: `npm run test -- App` and `npm run type-check` pass, and both locale files have the same `dashboard` key set.

## 4. How It Works page

- [x] 4.1 Add one sentence on the Popular and Power orders to the Tier area of `howItWorks.en.ts` and `howItWorks.es.ts`, stating that Power orders archetypes by tier and then by how well they perform, not by how often they are played. In `howItWorks.test.ts`, assert that both locales mention the two orders (spec "Dashboard data points explained"). Verify: `npm run test -- howItWorks` passes, including the same-structure test across locales.

## 5. Integration

- [x] 5.1 Run the CI checks locally: `rtk proxy npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`. Verify all four pass. The scraper is untouched, so `pytest` is not needed.
- [ ] 5.2 Open the PR and confirm on the Vercel preview (CLAUDE.md merge exception 1), on desktop and at ~375px:
  - the segmented control versus the single-pill fallback, and its fit beside Reset on the caption row;
  - the gap and height of the control next to Reset;
  - whether share bars that no longer decrease under Power read as intended.

  Record each outcome in design.md (Decision 5 and the share-bar risk). Verify: the user confirms the preview.

## Workflow follow-up

- Merge only after the user confirms the preview (exception 1).
- Sync the delta specs into `openspec/specs/` and archive the change.
