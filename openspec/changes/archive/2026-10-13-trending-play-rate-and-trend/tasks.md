# Tasks

## 1. Shared window and delta rules

- [x] 1.1 Add `precedingWindowStartISO` to `src/lib/windows.ts`. Export `deltaOf(currentPct, previousPct)` from `src/lib/shareDelta.ts` and have `shareDeltas` use both. Verify: existing `shareDelta` tests pass unchanged, plus new unit tests for `deltaOf` (up, down, the ±0.5 deadband edges) and the preceding boundary for `7days`/`2weeks`.

## 2. Slice deck totals from the metagame corpus

- [x] 2.1 Extend `useMetagame` with `decksPerArchetype`, `precedingDecksPerArchetype` (legal, size-filtered, empty under an event filter) and `sizeClassEventIds` (size-class events across the 28-day corpus) per design D1/D2. Add `sliceDeckTotal(counts, archetypeNames | null)` to `src/lib/trendingCards.ts`. Verify: hook tests cover legality, event, size and banned-deck cases, and the selected total equals `totals.decks`; unit tests for `sliceDeckTotal` cover all archetypes vs named ones.

## 3. Play rate and trend derivation

- [x] 3.1 Extend `rankTrendingCards` with `{ selectedTotal, precedingTotal, precedingRows }`. It returns `deckCount`, `playRatePct` (null when the selected total is 0) and `trend` (null below `MIN_PREV_DECKS`, absent-in-preceding = 0%), and drops `setCode`. Ranking stays unchanged. Verify: unit tests for each spec scenario under "Play rate column" and "Play rate trend column" (38%, sideboard 15%, new cards 20%, `<1%` formatting input, +6.2 / -1.8 / flat 0.4, absent card +20.0, thin baseline null, ranking unaffected).
- [x] 3.2 Update `useTrendingCards` to fetch selected and preceding windows in one `Promise.all` (skipping preceding calls under an event filter). A preceding-call failure blanks trends; Top New Cards still fails on its own. Take slice totals as input and derive the ranked tables in a `useMemo`. Verify: hook tests assert the preceding calls' date range `[now−2N, now−N)`, that they are skipped with an event filter, the failure isolation, and re-derivation without a refetch when the totals change.
- [x] 3.3 Add the drift guard test from design Risks: for one fixture corpus and every filter combination (none, archetype, tier, event, size, banned deck present), every card's `deck_count` ≤ its slice total. Verify: the test passes and fails if a filter is dropped from one side.

## 4. Table UI

- [x] 4.1 Rebuild `TopCardsTable` with the uniform columns rank · card · Avg · Copies · Decks · Trend. Remove `showAvg`/`showSet` and the set chip. Move the row grid into `dashboard.css` classes, with `container-type: inline-size` and an `@container` rule hiding Copies (starting threshold ~520px). Render play rate (`N%` / `<1%` / `–`) and the trend via `ShareDelta` with a new `labelKeyPrefix` prop. Add ES/EN keys `trending.col.decks`, `trending.col.trend`, `trending.trend.up|down|flat` and remove `trending.col.set`. Verify: `TopCardsTable` and `ShareDelta` tests assert the header and cell order, no set chip, the Copies cells' hide class, blank trend when null, and localized aria labels in both languages. `npm run lint && npm run type-check && npm run test` pass.
- [x] 4.2 Wire `App.tsx`: compute selected and preceding totals with `sliceDeckTotal` from `trendingArchetypeNames`, pass `sizeClassEventIds` as `eventIds`, drop the per-table props, and gate the trending section on both hooks having loaded. Verify: the App-level test shows all four tables with the new columns, and Pre-Modern still hides Top New Cards.

## 5. How It Works copy

- [x] 5.1 Rewrite the trending bullets in `src/content/legal/howItWorks.en.ts` and `.es.ts` per design D6: the four tables ranked by Copies, plus one bullet each for Avg, Copies, Decks and Trend, with no set-code sentence. Verify: `parity.test.ts` passes, and a content test asserts all four terms appear in both locales and "set code"/"código de set" does not.

## 6. Preview confirmation

- [x] 6.1 Open the PR and, on the Vercel preview, confirm at 375px, 1280px (sidebar open and closed) and 1440px: the column widths, the Copies-hiding threshold, the trend chip vs a borderless variant, and the ES header abbreviations. Record the settled values in design.md D4/D5. Verify: the user signs off on the preview (CLAUDE.md exception 1, so no merge before that).

## Workflow follow-up

- Sync the delta specs (`/opsx:sync`) and archive the change (`/opsx:archive`) after the PR merges.
