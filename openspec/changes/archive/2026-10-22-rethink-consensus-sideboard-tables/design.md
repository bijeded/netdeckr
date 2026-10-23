# Design

## Context

See proposal.md (Why) for the motivation, and the delta specs for the behavior that changes.

Current state:

- `buildStockList` in `src/lib/stockList.ts` ranks each board's cards once, then uses that ranking for two things. It builds the stock list (`main`, `side`). It also maps the same ranked cards to `ConsensusRow`s (`consensus`, `sideboardPlan`), each with an inclusion % and a core/flex/spicy band from `bandOf`.
- `ConsensusTable.tsx` renders those rows with a 10-row pager. `ArchetypeAnalysis` is its only consumer, and places two of them in an `.analysis-two-col` grid below the performance section. That grid also has a `composition-pending` fallback panel that shows the card-data loading or error state while the tables can't render.
- Elsewhere in the tab, the stock list section shows the same card-data loading and error state on its own, and `CompositionRail` renders only once card data is ready.
- `--band-core`, `--band-flex` and `--band-spicy` (`colors.css`) exist for the band chips. `--band-flex` is also the end color of the performance funnel's `.analysis-bar-finish` gradient.
- `.analysis-panel-body`, including its ≤ 640px padding override, sits in the consensus CSS block but is also used by `AnalysisPerformance`.

## Goals / Non-Goals

**Goals:**
- Delete the two tables and everything that exists only for them: the component, the row type and band logic, the CSS, the tokens and the locale strings. No dead code is left behind.
- Leave the stock list's output, and every other section of the Analysis tab, unchanged.

**Non-Goals:**
- Changing the `archetype_card_stats` RPC or the data it returns. The stock list still needs all of it.
- Bringing back the removed information (full card list, long-tail "spicy" cards) somewhere else, such as a Lists tab view or longer trending tables.
- Redesigning the Analysis tab's layout beyond closing the gap the tables leave.

## Decisions

### 1. Trim `buildStockList` to the stock list only

Remove `ConsensusRow`, `ConsensusBand`, `bandOf`, `CORE_MIN_PCT`, `FLEX_MIN_PCT`, and the `consensus` / `sideboardPlan` fields of `StockListResult`. The internal `RankedCard` keeps `weighted`, `copies` and `avgCopies`, because `avgCopies` is the second tie-breaker in the ranking sort. Its `decks` field fed only `toRow`, so it goes.

- *Alternative: leave the rows in the result and just stop rendering them.* Rejected. It keeps computing, testing and typing an output nothing reads, and the module header would still describe the tables.
- The stock list's ranking (weighted inclusion, then average copies, then name) stays exactly as it is. The existing `buildStockList` tests on `main` / `side` are the regression check.

### 2. Delete `ConsensusTable.tsx` instead of keeping it for later

It has one consumer. Git history can bring it back if the information returns in another form.

### 3. Drop the bottom row and its pending panel

Remove the `.analysis-two-col` wrapper, which only the tables use, along with its `composition-pending` fallback. The stock list section already shows the card-data loading and error state, so the "Analysis loading and failure states" requirement is still met without the fallback. ~~No test references `composition-pending`, so no test needs to move.~~ *Superseded while writing tasks:* no test names the panel's test id, but the card-data error test in `ArchetypeAnalysis.test.tsx` expects the error message twice, once in the stock list and once in this panel. That test changes to expect the message exactly once, inside `stock-list`.

- *Alternative: keep the fallback panel.* Rejected. It would show a second copy of a spinner or error that the stock list section already shows.
- After this change the tab ends with the performance section. Whether the bottom spacing looks right with nothing below it was **pending visual confirmation** on the Vercel preview. No spacing change was planned up front. **Confirmed on the PR #227 preview:** the spacing looks right on desktop and mobile, so no spacing change is needed.

### 4. CSS: remove table rules, keep `.analysis-panel-body`

Delete `.analysis-two-col` (from its base rule and the ≤ 960px query), `.analysis-table*`, `.analysis-band-*`, `.analysis-card-cell` and `.analysis-pager*`. Move the ≤ 640px `.analysis-panel-body` padding override out of the consensus block so `AnalysisPerformance` keeps it, unchanged.

### 5. Rename the token the funnel still uses, delete the other band tokens

Delete `--band-core` and `--band-spicy`. Rename `--band-flex` to a funnel-scoped token, `--funnel-accent`, keeping the same value `#7fd8ff`, and point `.analysis-bar-finish` at it. The new comment in `colors.css` says what the token is for, not where it came from.

- *Alternative: keep `--band-flex` as it is.* Rejected. A "band" token with no bands would mislead whoever edits it next.
- *Alternative: point the funnel at an existing token, such as the T2 cyan.* Rejected. That changes a color this change has no reason to touch.
- Visual effect: none (**calculated**: the same hex value, so the gradient renders identically; **confirmed** unchanged on the PR #227 preview).

### 6. Copy: remove only strings with no other reader

In `en.json` and `es.json`, remove `analysis.composition.{consensusTitle, sideboardTitle, card, played, bands, pagerLabel, prevPage, nextPage, pageOf}`. Keep `cards_one` / `cards_other`, which `CompositionRail` reads. In `howItWorks.en.ts` and `howItWorks.es.ts`, remove the Consensus/Consenso and Sideboard plan items. Update `howItWorks.test.ts`: drop the `parts.consensus` threshold assertions and add one checking that the section no longer mentions the bands (spec scenario "Bands and wildcards are explained").

## Risks / Trade-offs

- [The trending tables are not a full replacement] They show the top 10 per board and follow the sidebar filters. The removed tables listed every card over the fixed 2-week, all-events corpus, so the long tail of spicy one-ofs is no longer visible anywhere. → Accepted, since users found the tables redundant. The spec's Migration notes point users to the trending tables with the archetype isolated. If this information is ever wanted back, it should be a new proposal, not a revert.
- [Hidden CSS consumers] A deleted class or token could still be referenced somewhere else. → Before deleting, search `src` for each selector and token. Lint, type-check and the Vercel preview catch what's left.
- [The tab's end looks unfinished] → Checked on the preview (Decision 3). Confirmed fine on desktop and mobile; no fix needed.

## Migration Plan

Single PR, frontend only, with no data or schema changes. It falls under CLAUDE.md merge exception 1 (user-visible), so it merges only after the Vercel preview is confirmed. Rollback: revert the PR.
