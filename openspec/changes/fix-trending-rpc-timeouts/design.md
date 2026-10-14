# Design

## Context

See proposal.md (Why) for the symptom and the measured cause. The state that shapes the approach:

- `top_cards` and `recent_set_top_cards` are `language sql` functions with `set search_path`, so they are never inlined. The legality filter is a correlated `not exists` over `deck_cards banned_line` joined to `banned_cards`. `illegal_deck_ids` uses the same lookup.
- `deck_cards` is indexed only on `deck_id`. With no index on `scryfall_name`, the planner hashes the format's banned names and seq-scans the whole table. Measured on Modern 2 weeks: 177,804 rows scanned, 1,589 matches, 2.2 s of a 2.3 s query.
- The browser calls three trending RPCs concurrently, alongside the paginated corpus fetch and `illegal_deck_ids`. The `anon` role's statement timeout is 3 s.
  - *Updated during apply:* #211 (play rate and trend columns), merged after this design was drafted, repeats each trending call over the preceding window, so an unfiltered load now makes **six** concurrent trending RPCs. That doubles the load the index has to absorb; it does not change the approach. Preceding-window failures are swallowed (they only blank a trend), so they are reported too (decision 3).
- `useTrendingCards` already exposes `error` (Creatures/Spells/Sideboard failed together: one `Promise.all`) and `newCardsError` (Top New Cards alone). `App.tsx` reads neither, and `TopCardsTable` only knows `emptyMessage`.
- Sentry is loaded lazily (`src/lib/sentry.ts`). The only existing capture site, `ErrorBoundary`, dynamically imports `@sentry/react` and calls `captureException`.

## Goals / Non-Goals

**Goals:**
- The legality and recent-set lookups cost a function of matches, not of total table size.
- A trending load failure is visibly an error, and reaches Sentry.

**Non-Goals:**
- Rewriting the RPC SQL, merging the three calls into one, or caching aggregates.
- Changing the `anon` statement timeout.
- Retrying failed trending calls.
- Changing the metagame grid's own error handling.

## Decisions

### 1. An index alone, no RPC rewrite

Add `create index if not exists deck_cards_scryfall_name_idx on public.deck_cards (scryfall_name, deck_id);`.

A rolled-back test in production showed the planner switching on its own to a nested loop driven from `banned_cards`: 52 index-only probes, 1,589 rows, 38 ms for the legality lookup, 139 ms for the whole query (from 2,320 ms). `deck_id` is the second column so the probe is index-only and the anti-join key comes straight from the index. The same index serves `recent_set_top_cards`'s join on `recent_set_cards.card_name` and `illegal_deck_ids`.

Alternatives considered:
- **Rewrite the legality filter as a CTE of illegal deck ids.** Measured at 402 ms without the index, still a full read of `deck_cards`, and the gain depended on a parallel plan the planner happened to choose. With the index it adds nothing, and it touches three functions whose filter blocks must stay in sync.
- **Merge the three trending RPCs into one.** Cuts concurrent load to a third, but changes the RPC contract and the hook. Not needed once each call is ~100–200 ms; revisit if load grows.
- **Raise the `anon` statement timeout.** Hides the regression, and keeps a 2 s query on every page load.

### 2. Error state through `TopCardsTable`'s existing message slot

`App.tsx` passes the localized error message to `TopCardsTable` in place of `emptyMessage` when the relevant error is set: `error` for Creatures/Spells/Sideboard, `newCardsError` for Top New Cards. On failure the hook already returns empty card arrays, so the table falls through to its `EmptyState` and shows that message. There is one shared error string, `trending.loadError` (ES/EN), rather than one per table.

Alternative considered: a separate `errorMessage` prop with its own visual treatment. That is more surface for no behavioral gain. Whether the error should look different from the empty state (icon, color) is pending visual confirmation on the Vercel preview. This design asserts only that the text differs.

### 3. Report from the hook, through a small shared helper

Add a `captureError(error, context)` helper in `src/lib/sentry.ts` that dynamically imports `@sentry/react` and calls `captureException`, swallowing import failures, mirroring `ErrorBoundary`. `useTrendingCards` calls it where it sets `error`, where it records `newCardsError`, and where a preceding-window call fails, tagged with the RPC, the slice (`selected` / `preceding`), format and window. The preceding-window case was added during apply (see Context): those failures change no table, so without a report they would be invisible. When no DSN is set, `Sentry.init` never ran and `captureException` is a no-op, so local dev and CI stay silent.

Reporting in the hook rather than in `App` keeps it to one report per failed load and leaves `App` purely presentational. Supabase errors are plain objects (`{ code, message }`), not `Error` instances, so the helper wraps them in an `Error` with the code in the message to keep Sentry's grouping readable.

`ErrorBoundary` is switched to the helper so there is one capture path.

## Risks / Trade-offs

- [Building the index locks `deck_cards` against writes for a few seconds] → Apply it outside the scraper's cron windows. `create index concurrently` is not used, because `schema.sql` is applied as one script in the SQL editor, which runs it in a transaction where `concurrently` is not allowed.
- [The index adds write cost to every scraped deck card] → One B-tree on a ~177k-row table pruned to 30 days. Negligible next to the scraper's rate limiting.
- [Table growth could make the slice part slow again] → The remaining cost is the slice itself (~80 ms for Modern 2 weeks) and grows with decks in the window, not table size. Sentry reporting now surfaces a timeout if it comes back.
- [The planner could pick the seq scan again if statistics drift] → Run `analyze public.deck_cards;` after creating the index. If it recurs, decision 1's CTE alternative is the fallback.
- [The index ships in `schema.sql` but takes effect only once applied by hand] → The migration step is a tracked task, and the fix is confirmed by timing the live RPCs afterwards.

## Migration Plan

1. Merge the PR. Frontend changes deploy with Vercel; they are safe before the index exists (failures just show the error state and report to Sentry).
2. Outside a scraper run, execute in the Supabase SQL editor:
   `create index if not exists deck_cards_scryfall_name_idx on public.deck_cards (scryfall_name, deck_id); analyze public.deck_cards;`
3. Verify: time `top_cards` and `recent_set_top_cards` for MO and PAU at 2 weeks with the anon key (expect well under 1 s), and load Modern 2 weeks in production.

Rollback: `drop index if exists public.deck_cards_scryfall_name_idx;` restores the previous plans. The frontend change needs no rollback.
