# Design

## Context

See proposal.md for the motivation and specs/ for the required behavior.

- **Trending data** comes from `useTrendingCards`. It makes one `top_cards` call per board plus one `recent_set_top_cards` call, each over `[windowStart, tomorrow)` and narrowed by archetype ids, one event id, and a set of event ids (the event-size filter, resolved in `App.tsx` from `useMetagame`'s `events`). Each row already carries `deck_count` (distinct decks running the card), which is the play-rate numerator. Ranking and averages live in the pure `src/lib/trendingCards.ts`.
- **The deck corpus** comes from `useMetagame`. It fetches 28 days of decks once, applies legality at a single boundary, and narrows by window, event and size class. It does not apply the archetype or tier filter. Instead it groups the selected window's decks by archetype in `fullDecksByArchetype`, which is uncapped. The archetype share delta (`src/lib/shareDelta.ts`) already compares each window with the one before it over this corpus, using `DELTA_EPS = 0.5` and `MIN_PREV_DECKS = 3`.
- **The `events` list `App.tsx` sends as `eventIds`** covers the selected window only. A preceding-window call given that list would match no events whenever a size filter is active.
- **`TopCardsTable`** is styled with inline `CSSProperties`. Its grid template is built from the `showAvg`/`showSet` props.
- **This change overrides two earlier decisions.** Top Sideboard Cards had no Avg column, and Top New Cards had a set-code chip from `add-recent-set-cards-table`. Both are replaced: the user asked for one layout across all four tables and dropped Set to give mobile room (see proposal.md).

## Goals / Non-Goals

**Goals:**
- Play rate and trend use the same legal, filtered deck set as the rest of the dashboard, with legality applied once and the filters not reimplemented.
- The rules for the trend (deadband, thin-baseline suppression, window arithmetic) exist in one place, shared with the archetype share delta.
- No change to the Supabase schema or RPCs.

**Non-Goals:**
- Changing the ranking (it stays copies → deck count → name).
- Per-card history beyond the preceding window, or sparklines.
- Removing `set_code` from `recent_set_top_cards`'s return columns. That would be a drop-and-recreate migration for no user-visible gain; the column simply goes unused.

## Decisions

### D1. Play-rate denominator comes from the `useMetagame` corpus (option 1a)

`useMetagame` gains two outputs:

- `decksPerArchetype`: the selected window's legal deck count per archetype, after event and size filters. This is the same set as `fullDecksByArchetype`, as counts.
- `precedingDecksPerArchetype`: the same count over the preceding window, after the size filter. If an event filter is active, it is empty, because that event is not in the preceding window.

A pure helper in `trendingCards.ts`, `sliceDeckTotal(countsByArchetype, archetypeNames | null)`, sums all archetypes when the archetype filter is null and only the named ones otherwise. `App.tsx` already builds `trendingArchetypeNames` for the trending call, and the same names go to this helper for both windows. With a tier filter, the tier membership is the current window's in both windows. That is intentional: the trend then answers "how are the cards played by this tier's archetypes changing".

**Alternative rejected: a `slice_deck_count` RPC.** It would be exact by construction, but it would be a third copy of the filter block `schema.sql` already says to keep in sync, and it would bring back a migration. The drift risk of 1a is covered by a test (see Risks).

### D2. Preceding-window card counts come from the same RPCs over an earlier date range

`useTrendingCards` makes its three calls twice:

- the selected window `[now−N, tomorrow)`;
- the preceding window `[now−2N, now−N)`, half-open, so no day is counted in both.

All six calls run in one `Promise.all`. A failed preceding call, for any table including Top New Cards, only leaves that table's trends blank (`null`); the table itself still renders. The selected-window calls keep their existing failure handling: a Top New Cards failure empties only that table, and a `top_cards` failure empties all of them. *(Clarified during apply: the first draft read as though a preceding Top New Cards failure would empty the table, which would discard valid current data over a missing comparison.)*

When an event filter is active, the preceding calls are skipped, because their result is known to be empty and the trend is suppressed anyway.

Size filter: `useMetagame` also exposes `sizeClassEventIds`, the ids of every event in the 28-day corpus in the selected size class. `App.tsx` sends that list instead of `events.map(e => e.id)`. Each call's date range already limits which of those events can match, so one list serves both windows. `events`, which feeds the Event filter's options, is unchanged.

The window arithmetic moves into one helper in `src/lib/windows.ts` (`precedingWindowStartISO`), used by `shareDelta.ts`, `useMetagame`, and `useTrendingCards`, so the three cannot disagree on boundaries.

**Alternative rejected: one RPC call spanning 28 days that returns per-window counts.** It needs a new RPC signature, so a migration.

### D3. Trend math is shared with the archetype share delta

`shareDelta.ts` exports a small `deltaOf(currentPct, previousPct): ShareDelta` holding the deadband and direction logic. `shareDeltas` and the card trend both call it. The card trend:

- is `null` when the preceding slice total is below `MIN_PREV_DECKS`, applied per table set exactly as for archetypes;
- treats a card missing from the preceding rows as 0%;
- is computed on unrounded rates.

The play rate is displayed rounded to a whole percent, or `<1%` when it is above zero but rounds to zero, as the spec requires. As a guard, it is `null` (rendered `–`) when the selected denominator is 0. That should be impossible given D1, but it stops a mismatch from rendering `Infinity%`.

`rankTrendingCards` gains a context argument `{ selectedTotal, precedingTotal, precedingRows }` and returns three new fields per `TrendingCard`: `deckCount`, `playRatePct` and `trend`. `setCode` is removed. The hook keeps the raw rows in state and derives the ranked tables in a `useMemo` keyed on the totals. That way a late-arriving or changed total re-derives without refetching, and the shaping stays out of JSX.

**Load gating:** the trending section renders only when both `useMetagame` and `useTrendingCards` have loaded. That avoids a flash of blank Decks/Trend cells. The two fetches already run in parallel.

### D4. The trend indicator reuses `ShareDelta`

`ShareDelta` gains an optional `labelKeyPrefix` (default `shareDelta`), and the tables pass `trending.trend`. That gives localized "Play rate up {{value}} points vs the previous period" labels while the glyphs, colors and number format stay identical to the archetype cards.

Whether the bordered chip reads well inside a dense table row, or needs a borderless variant, is **pending visual confirmation** on the preview.

### D5. Uniform columns, and Copies hidden by a container query

The `showAvg`/`showSet` props go away. Every table renders the same columns:

```
rank | card (1fr) | Avg | Copies | Decks | Trend
```

The row's grid template moves from inline styles to classes in `dashboard.css`. That is needed because inline styles cannot respond to a container query:

- the table `<section>` gets `container-type: inline-size`;
- an `@container` rule below the threshold switches to a five-track template and hides the Copies header and cells.

A container query is used rather than a media query because table width depends on the 2x2 grid and on whether the sidebar is open, not on the viewport (see spec "Narrow trending tables hide Copies").

**Calculated** (current padding 20px each side, gap 8px, rank 34px; Avg ~40, Copies ~56, Decks ~48, Trend ~64 are estimates):
- the non-name width with six columns is about 322px;
- at a 375px phone viewport the table is about 343px, so the name gets about 21px with Copies shown and about 77px with it hidden;
- in the 2x2 grid with the sidebar open, a table is about 469px at a 1280px viewport, leaving the name about 147px with Copies shown.

The exact track widths and the threshold (starting estimate ~520px of table width) are **pending visual confirmation** on the Vercel preview, and will be recorded here once settled.

Header labels: EN `Avg` / `Copies` / `Decks` / `Trend`; ES `Prom.` / `Copias` / `Mazos` / `Tend.`. Whether the ES abbreviations read clearly is **pending visual confirmation**. The `trending.col.set` key is removed.

**Alternatives rejected:**
- A `ResizeObserver` in React: an extra render per resize, a first-paint flash, and a JS dependency for layout.
- A viewport media query: it misses narrow tables in the desktop grid (calculated above).

### D6. How It Works copy

The single bullet for the three main trending tables and the Top New Cards bullet become:

- one bullet naming the four tables and stating that they rank cards by Copies;
- one bullet each for Avg, Copies, Decks and Trend.

The Top New Cards bullet loses its set-code sentence. ES and EN keep the same `Section[]` shape, so the existing `parity.test.ts` still holds.

## Risks / Trade-offs

- **[Denominator drift: the client-side corpus filters and the RPC filters disagree, giving play rates above 100% or quietly wrong]** → A hook-level test feeds the same fixture decks to both paths and asserts, for every filter combination (none, archetype, tier, event, size, banned deck present), that every `deck_count` ≤ the slice total and that the totals equal the deck count the Decks stat card shows. The `selectedTotal = 0` guard renders `–` rather than `Infinity%`.
- **[`now` is captured separately in the two hooks; across a UTC midnight their windows could differ by a day]** → The resulting skew is at most one day's decks, and both re-run on the next filter or window change. Accepted.
- **[Six more requests per filter change (3 → 6 RPC calls)]** → Each is the same indexed aggregation over a smaller range, run in parallel. Preceding calls are skipped under an event filter. Accepted.
- **[A preceding window with patchy scrape coverage can manufacture spikes]** → The same `MIN_PREV_DECKS` suppression as archetypes applies. A higher threshold for cards would be a separate, data-driven change.
- **[Container queries need recent browsers (Chrome 105, Safari 16, Firefox 110)]** → On older engines the rule is ignored and all six columns show. The table still works, only tighter.
- **[jsdom does not evaluate container queries]** → Tests assert the markup (Copies cells carry their hide class, header and cells line up). Actually hiding the column is confirmed on the preview.

## Migration Plan

Frontend-only; no database, RPC or pipeline change. The PR merges after the visual decisions (D4 chip variant, D5 track widths, threshold and ES labels) are confirmed on the Vercel preview, per CLAUDE.md exception 1. Rollback is reverting the PR.

## Open Questions

- Exact column widths and the Copies-hiding threshold (D5): settled on the preview.
- Bordered chip vs a borderless trend variant in table rows (D4): settled on the preview.
