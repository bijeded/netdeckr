# Design

## Context

- `useMetagame` already loads the format's whole retained corpus: decks from the last 28 days (two 2-week windows) with placement, player, and event (date, `player_count`), and the illegal (banned) deck ids. Every grid figure is derived client-side from it. Performance stats for the Analysis tab need no new fetch.
- Per-card data (`deck_cards`) is fetched one deck at a time today (`useDeckCards`). One archetype over 2 weeks is roughly 30–80 decks × ~30 lines, so 1,000–2,500 rows. That is over PostgREST's 1,000-row cap, the same limit noted for `top_cards`.
- The isolated archetype view (`?a=`) exists from #217: the card auto-expands, its header slot shows "← Back", and its body shows all deck rows. `useArchetypeSelection` owns `?a=` and its history semantics.
- Decklist rendering (type grouping, image grid, view toggle, export) lives inside `DecklistModal`. Export helpers (`exportTarget`, `buildArenaDeck`, `buildMtgoDeck`) and `cardCategory` are already pure modules.
- Power Score weighting (`finishQuality`, `sizeWeight`, `isUnrankedEvent`, `UNRANKED_QUALITY`) lives in `src/lib/powerScore.ts`. Event-size classes live in `src/lib/eventSize.ts`.
- Recharts is a dependency but no component imports it yet. This change is its first use.

## Goals / Non-Goals

**Goals:**
- One aggregate query per archetype analysis, under the row cap, with the database doing only the grouping.
- Keep every weighting and classification rule in TypeScript, in the modules that already own it, so the analysis cannot drift from the grid.
- A stock list that renders and exports through the same code as a real deck.
- No cost to the initial page load for users who never open the tab.

**Non-Goals:**
- Caching card stats across sessions or precomputing them in the pipeline.
- Changing how the grid card counts wins or tiers.
- Matchup inference of any kind.

## Decisions

### 1. Database function returns per-card deck arrays, not weighted results
`archetype_card_stats(p_format text, p_archetype_id bigint, p_start date, p_end date)` returns one row per `(board, card)`:

```
board | card_name (canonical, fallback scraped) | deck_ids bigint[] | quantities int[]
      | type_line | cmc | rarity | set_code | collector_number | image_url | small_image_url
```

- `deck_ids[i]` played `quantities[i]` copies, summed per deck first, so a card listed on two lines of one deck counts once.
- ~100–200 rows per archetype, well under the cap.
- Banned-deck exclusion copies the `NOT IN` hashed-subplan pattern from `top_cards` (and its comment on why), for the same planner reason.
- `set_code` and `collector_number` are taken from the same row, the one with the latest `released_at`, using paired ordered `array_agg(...)[1]`. Independent `max()` calls could pair a set with another printing's collector number and break the Arena import.
- `security invoker`, `stable`, granted to `anon, authenticated`, like the existing functions.

**Why not weight in SQL:** deck weight depends on `finishQuality`, `sizeWeight`, and unranked-event detection, all TypeScript. Duplicating them in SQL creates the drift the `top_cards` comment warns against for event-size bands. The client already holds each deck's placement and event, so it joins by `deck_id`.

**Alternatives considered:** passing deck ids as an array (unnecessary once the scope is fixed to 2 weeks and all events, which the archetype id and dates fully describe); paginating `deck_cards` from the client (2–3 round trips, more code, no ordering guarantees across pages); a pipeline-precomputed table (new table and scraper work, stale between runs).

### 2. Stock list and analysis are pure selectors
- `src/lib/stockList.ts` takes card-stat rows plus a `deckId → weight` map and returns `{ main, side, consensus, sideboardPlan }`. It is pure and unit-tested against the spec's scenarios.
- `src/lib/archetypeAnalysis.ts` takes the corpus decks and returns the performance figures and all chart series (funnel, per-size breakdown, share per day, curve, type split, wildcards), already shaped for Recharts, so no data shaping happens in JSX.
- Deck weight = `(isUnrankedEvent ? UNRANKED_QUALITY : finishQuality(placement)) × sizeWeight(player_count)`. An unparseable placement uses the lowest finish bucket (0.1) rather than 0, so the deck still counts toward inclusion. `finishQuality` and `isUnrankedEvent` are already exported; `UNRANKED_QUALITY` gets exported.
- Rows whose deck ids are missing from the client's legal 2-week corpus are ignored. This keeps the two sides consistent if the function and `useMetagame` disagree at a window boundary.
- Medians (main size, land count, side size) come from per-deck totals rebuilt from the arrays. An even-length median rounds half up.
- Copy count = mode among decks playing the card, with ties going to the higher count. Fill order = weighted inclusion, then average copies, then canonical name, so the output is deterministic.

### 3. Consensus table shows plain inclusion, ordered by weighted rank
Bands and the displayed % use plain inclusion ("played in 12 of 32 decks"), which players can verify. Ordering and stock-list membership use weighted inclusion. A card can therefore sit above one with a slightly higher plain %. The table header says it is ordered by finish-weighted popularity.
**Alternative:** show weighted % everywhere. Rejected: "% of decks" that isn't a share of decks is harder to trust.

### 4. Performance figures reuse the grid's derivations over an unfiltered 2-week slice
`useMetagame` exposes the format's legal, unfiltered corpus (it already holds it). The selector applies `windowStartISO('2weeks')` / `precedingWindowStartISO('2weeks')`, then calls `deriveBreakdown`, `shareDeltas`, and the existing Power Score / tier functions. Share, change, tier, and wins therefore match the card on Last 2 Weeks by construction. The tier is identical in every window anyway, since tiers are computed from the 2-week corpus.

### 5. Tab state lives in URL alongside `?a=`
`useArchetypeSelection` grows a `tab` value (`'lists' | 'analysis'`). "Analysis →" sets `?a=` and `tab=analysis` in one history push, so Back returns to the grid. Tab switches use `replaceState`. Clearing the archetype removes both params. Invalid values are dropped on load, mirroring `?a=` reset.

### 6. Shared decklist pieces
~~`DecklistModal`'s board rendering (grouped list, image grid, view toggle, export button) is extracted into a `DecklistBody` component taking `main`, `side`, `format`, and `name`.~~

**Superseded during apply (task 5.1):** the modal places the view toggle and export button in its header actions row (beside close) and the export notice in its header info, apart from the boards in its body. A single `DecklistBody` would have forced a modal layout change. The extraction is instead four pieces, each placed where its host needs it: `DecklistBoards` (main/side, list or image view), `DecklistViewToggle`, `DeckExportButton`, and the `useDeckExport` hook (export text, clipboard, localized notice). The modal and the stock list panel both compose them. The modal's behavior and tests are unchanged.

### 7. Analysis tab is lazy-loaded
The Analysis tab component (and with it Recharts) loads via `React.lazy` on first selection, the same deferred-chunk approach used for Sentry. The card-stats request starts when the tab mounts, not when the archetype is isolated.

### 8. Visual direction (all pending visual confirmation on the Vercel preview)
Intended treatments, none settled:
- **Tab toggle:** segmented two-option control in the existing `window-pill` family, beside "← Back".
- **Desktop layout:** stock list full width first, with a side rail for curve, type split, and wildcard cost. Then performance. Then consensus and sideboard plan side by side. **Mobile:** single column in that order.
- **Charts:** placement funnel as stepped horizontal bars in the neon ramp; share per day as a small area sparkline with a neon gradient; curve as columns with JetBrains Mono labels; type split as one stacked bar.
- **Consensus bands:** core / flex / spicy as a coloured left rail per row, plus a thin inclusion bar. Band colours must not reuse the up/down/flat semantic colours, so they don't read as trends.
- **Wildcards:** four rarity pips with counts. Rarity colours are new tokens in `colors.css`.
- **Contrast (calculated during apply):** every new text/background pair clears 4.5:1; chart labels sit on `--surface-card`, never over art. On `--surface-card`: band text core 8.5, flex 11.7, spicy 10.0; rarity mythic 7.2, rare 11.2, uncommon 10.6, common 5.7; `--text-muted` 5.7 (used instead of `--text-faint`, 3.7, for analysis text). Over the expanded card's neon-tinted panel: selected tab `--neon-text-soft` ~10, idle tab `--text-secondary` 5.9, filter note `--text-muted` 4.8.
- **Implemented as (pending preview):** funnel, size breakdown, inclusion, and type split are HTML/CSS bars (legible, accessible, testable); Recharts is used for the share-per-day sparkline and the mana curve only, each with its values also exposed as text. Share-per-day gaps are left unconnected so a day without events never reads as a value.

Exact sizes, spacing, colour values, and chart dimensions are recorded here once confirmed on the preview.

## Risks / Trade-offs

- **Stored rarity is the paper printing's, not Arena's** → occasionally off by one rarity, and cards missing from Arena can't be detected. Mitigation: label the wildcard cost as approximate.
- **Wins vs funnel disagreement** → the card counts any "1" placement as a win (League decks included), while the funnel excludes unranked events. The two can show different "1st" counts. Mitigation: keep card parity for wins (spec), label the funnel as "ranked events", and show the League deck count beside it.
- **Function deployment order** → if the frontend ships before `schema.sql` is applied to production, the tab's card data fails. Mitigation: apply the function first (task 1), and the spec'd error state keeps the tab and dashboard usable regardless.
- **Weighted fill surprises** → a highly weighted 1-of from one winning list can beat a widely played 2-of for the last slot. Mitigation: the consensus table shows both numbers; tuning stays inside the pure module, covered by tests.
- **Refactoring `DecklistModal`** → regression risk in a well-tested component. Mitigation: extract with the existing modal tests unchanged and passing before adding the stock list.
- **First Recharts use** → bundle size and API drift. Mitigation: lazy chunk (Decision 7); check current Recharts docs via context7 before writing chart code.

## Migration Plan

1. Add `archetype_card_stats` and its grant to `supabase/schema.sql` (explicit migration task). Apply it to the production Supabase project in the SQL editor. Verify with a call for a known archetype as `anon`: rows returned, under 1,000, response well under the 3s anon timeout.
2. Ship the frontend PR, confirmed on the Vercel preview (user-visible change).
3. **Rollback:** revert the frontend PR. The function is read-only and harmless to leave in place; `drop function` if it needs removing.
