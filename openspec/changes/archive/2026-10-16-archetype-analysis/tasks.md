# Tasks

## 1. Database migration (explicit `schema.sql` change)

- [x] 1.1 Add `archetype_card_stats(p_format, p_archetype_id, p_start, p_end)` to `supabase/schema.sql` per design Decision 1: per-deck summed quantities, `deck_ids`/`quantities` arrays, paired latest-printing `set_code`/`collector_number`, `top_cards`' `NOT IN` banned-deck exclusion with its rationale comment, `security invoker`, `stable`, and a grant to `anon, authenticated`. Verify by self-review against the `top_cards` block and by task 1.2 succeeding.
- [x] 1.2 Hand off to the user: apply the function in the production Supabase SQL editor. Verify with an `anon` call for a high-volume archetype (e.g. Standard's #1 over the last 14 days): rows returned, fewer than 1,000, response well under 3s. This blocks task 7.2, not the frontend work.

## 2. Pure analysis logic

- [x] 2.1 Export `UNRANKED_QUALITY` from `src/lib/powerScore.ts` and add `src/lib/stockList.ts` (deck weight, weighted inclusion, mode copies with high tie-break, median main/land/side sizes with half-up rounding, land/non-land fill with trim, sideboard fill, deterministic tie-breaks, ignoring deck ids outside the corpus, consensus + sideboard-plan rows with plain inclusion, bands, and stock-list markers). Verify with `src/lib/stockList.test.ts` covering every stock-list, consensus, and sideboard-plan scenario in `specs/archetype-analysis/spec.md`, plus the existing `powerScore` tests passing.
- [x] 2.2 Add `src/lib/archetypeAnalysis.ts` returning performance figures and Recharts-ready series: 2-week share and change via `deriveBreakdown`/`shareDeltas`, tier and Power Score, deck/event/win counts, ranked-only funnel and top-8 rate with a separate unranked count, per-size-class breakdown via `sizeClassOf`, share per day with gaps on event-less days, curve with open-ended top bucket, type split via `cardCategory`, wildcard cost (Standard/Pioneer only, basics excluded), and the `< 5` small-sample flag. Verify with `src/lib/archetypeAnalysis.test.ts` covering the performance, curve, wildcard, and small-sample scenarios, including parity with the grid's 2-week share/delta/tier/wins for the same corpus.

## 3. Data access

- [x] 3.1 Expose the format's legal, unfiltered corpus from `useMetagame` without changing any existing output. Verify the existing `useMetagame` tests pass unchanged and a new test asserts the exposed corpus ignores the active window, event, event-size, and tier filters.
- [x] 3.2 Add `src/hooks/useArchetypeCardStats.ts` calling the RPC for `(format, archetypeId, 2-week start, end)`, with loading/error state and a stale-response guard on archetype or format change. Verify with `useArchetypeCardStats.test.tsx` (mocked Supabase): params sent, rows mapped, error surfaced, stale response discarded.

## 4. Tab state in the URL

- [x] 4.1 Extend `useArchetypeSelection` with `tab` (`lists` | `analysis`): opening the analysis pushes `?a=` and `tab=analysis` in one history entry, tab switches replace, leaving the archetype removes both params, an invalid `tab` or one without a valid `?a=` is dropped silently. Verify with `useArchetypeSelection.test.tsx` covering each scenario of the "Selected tab is persisted in the URL" requirement.

## 5. Shared decklist body

- [x] 5.1 Extract the board rendering, view toggle, and export from `DecklistModal` into `DecklistBoards`, `DecklistViewToggle`, `DeckExportButton`, and `useDeckExport` (design Decision 6, superseded form). Verify `DecklistModal.test.tsx` passes with no assertion changes, plus a small `DecklistBoards.test.tsx` rendering a synthetic deck.

## 6. UI

- [x] 6.1 Archetype card header: add "Analysis →" beside "View all lists →" on grid cards (same treatment, shared full-width row on mobile), and on the isolated card a Lists / Analysis segmented toggle beside "← Back" (keyboard-operable, selected tab exposed to assistive tech). Add ES/EN strings. Verify with tests for each scenario of the modified and added `archetype-decklists-view` requirements (control presence, opens the Analysis tab, Back returns to grid, toggle absent outside isolation, Lists default).
- [x] 6.2 Add the lazy-loaded Analysis tab component: scope label with deck/event counts, the conditional filter note, the stock list panel on `DecklistBody` with format-correct export and the archetype name, small-sample labels, and loading/error states that leave the Lists tab working. Add ES/EN strings. Verify with tests for the scope, filter-note, stock-list display/export, small-sample, and failure scenarios, and that the tab's chunk is not requested until Analysis is selected.
- [x] 6.3 Before writing chart code, check current Recharts docs via context7. Build the performance section (funnel, per-size breakdown, share-per-day sparkline), consensus table, sideboard plan, curve, type split, and wildcard pips, with new rarity and band tokens in `src/styles/tokens/colors.css` per design Decision 8. Add ES/EN strings including chart labels and tooltips. Verify with tests that assert rendered values (counts, bands, markers, wildcard absence outside Standard/Pioneer), not style values, and by checking every new text/background token pair clears 4.5:1.

## 7. Integration

- [x] 7.1 Run `npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`. Verify all pass and the build output emits Recharts in a separate chunk from the main bundle.
- [x] 7.2 Open the PR and confirm the Analysis tab on the Vercel preview against production data (requires 1.2): stock list exports and imports cleanly into Arena for a Standard archetype, figures match the 2-week card, layout works at phone width. Record the confirmed visual values in `design.md` Decision 8.

## Workflow follow-up

- User-visible change: per CLAUDE.md exception 1, do not merge until the user confirms the Vercel preview.
- After merge: `/opsx:verify`, then `/opsx:sync` and `/opsx:archive`.
