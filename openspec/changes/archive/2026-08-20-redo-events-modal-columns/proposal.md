## Why

The Events StatCard modal lists each event as one run-on string — `"RCQ Madrid — 14 Aug (128 players)"` — with a deck count in the right column. Three facts are welded into a single sentence, so nothing lines up down the list: dates and player counts land wherever each event's name happens to end, and the list cannot be scanned by date or by size.

The deck figure is also answering a question the card never asked. The Events StatCard counts **events**, and the modal's breakdown of that number is one row per event — the row count. A per-event deck total is a different metric riding along in the column reserved for the card's own breakdown.

## What Changes

- The Events modal renders each event across three aligned columns — **date**, **event name**, **player count** — replacing the single composed label.
- An event with **no recorded date** or **no recorded player count** names that fact as "Unknown" / "Desconocido" in the cell, rather than silently dropping it. Unsized events are a real class in this product (the Event size filter offers "Unsized"), so their absence of size is worth showing.
- The per-event **deck count is removed** from the modal.
- The leading **"All events" row spans the full row width** instead of taking the column grid. It is the filter's default, not an event, so the columns do not apply to it and em dashes would misstate "not applicable" as "not reported".
- The shared `FilterModal` gains two optional per-row capabilities — a **leading fixed column** and a **full-width row** — both reserved list-wide the way its middle column already is. The Archetypes and Decks modals use neither and are unchanged.

Not breaking: no data, query, or filter behavior changes. The set of events listed, their order (date descending), and what selecting a row does are all untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: the **StatCard filter modals** requirement changes for the Events modal only — its row composition moves from one composed label plus a deck count to three aligned columns with em-dash fallbacks, its "All events" row becomes full-width, and the deck-count figure is removed.

## Impact

**Affected code**

- `src/components/FilterModal.tsx` — two new optional `FilterModalRow` fields; the row renderer branches on the full-width case.
- `src/styles/dashboard.css` — one new leading-column rule and one full-width row rule alongside the existing `.filter-modal-row-*` set.
- `src/App.tsx` — `eventRows` is rebuilt; the `decks` helper and `windowDecks` become unused and are removed with it. Both are used only by `eventRows`.
- `src/App.test.tsx`, `src/components/FilterModal.test.tsx` — assertions on the Events modal's rows.

**Not affected**

- `src/lib/eventLabel.ts` stays as it is. The composed label is still what the header caption and the sidebar `EventSelector` dropdown need, and both require a flat string. Only the modal stops using it.
- No Supabase table, RLS policy, query, or scraper behavior. No change to the 7days/2weeks window model or the 30-day retention window. The modal re-renders data the client already holds.
- The `filters.deckCount` translation key, still used elsewhere in the dashboard.

**Blast radius**

User-visible and confined to one modal. Per the project's merge rules this is exception 1 — it needs confirmation on the Vercel preview before merge.

**Brought into scope on review**

Originally noted here as out of scope: the spec's `StatCard filter modals` requirement stated the tier modal's rows carry two figures, but `tierRows` in `App.tsx` sets only one, leaving `FilterModal`'s `metaSecondary` field and its CSS exercised solely by `FilterModal.test.tsx`. The user asked for the dead field to be deleted, so it is — along with its CSS and the spec scenarios that described the two-figure behavior the app had already abandoned.
