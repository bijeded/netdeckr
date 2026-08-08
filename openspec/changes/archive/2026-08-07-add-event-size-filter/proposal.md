## Why

The dashboard can narrow the metagame to **one** named event, but not to a *class* of events. A player who wants to discount 12-player local weeklies, or to look only at the serious end of the field, has no way to express that — they must know and pick individual events one at a time. Tournament size is already stored on every event (`events.player_count`, populated by the scraper and backfilled) and is already surfaced in event labels, so the signal exists and is simply not filterable.

## What Changes

- Add a **Event size** sidebar filter group that restricts the corpus to events in one size band, alongside the existing Event, Archetype, and Tier groups.
- Four size bands, by `player_count`: **Small** (<32), **Medium** (32–95), **Large** (96–255), **Massive** (256+).
- A fifth, separate **Unsized** option for events whose `player_count` is null (MTGTop8 does not report a size for ~14% of events). Unsized events are their own selectable class — they are never silently folded into Small, and they are never hidden by a size selection unless the user picks a size band.
- The size filter combines (AND) with the existing format, time-frame, event, archetype, and tier filters, and narrows the Event filter's own option list to events in the selected band.
- Size selection participates in the existing "Clear filters" / main-window "Reset" controls and in auto-reset of invalid selections.
- Trending tables recompute within the size-filtered slice, as they already do for the event filter.
- **Not** changing tier assignment. Power Score already weights each finish by its event's size (`sizeWeight`), and tiers stay anchored to the full 2-week corpus exactly as they do under the existing event filter. Revisiting the tier calculation is explicitly deferred.
- **Not** adding an event prestige/level signal. Size and stakes are independent axes — Worlds is small, an MTGO League can be large — and the prestige signal (MTGTop8's event star rating) is not currently scraped and has no column. Deferred to its own change.

## Capabilities

### New Capabilities

None. This extends the existing filter model rather than introducing a new capability.

### Modified Capabilities

- `metagame-breakdown-view`: adds an Event size filter requirement; amends the requirements for how filters combine over the deck corpus, for the Event filter's option list (now narrowed by an active size band), for auto-reset of invalid selections, and for clearing/resetting filters.
- `trending-cards-view`: amends "Trending respects active filters" so an active size band narrows the trending slice.

## Impact

- **Frontend, plus one additive database-function change.** No table, column, RLS, or scraper change: `events.player_count` already exists, is already selected by the metagame query, and is already carried through to the client as `EventOption.playerCount`.
  - **Correction (made during implementation).** This proposal originally claimed "frontend only, no schema change". That held for the metagame breakdown, which is derived from decks in the browser and can be filtered freely — but not for the trending tables, which are aggregated server-side by the `top_cards` RPC and reach the client already summed across events. The RPC's `p_event_id` accepts a single id, so neither client-side filtering nor passing the size-matching events was possible. Making trending respect the size filter requires extending `top_cards` with an event-id **array** parameter; the client passes the size-narrowed event ids, keeping the band thresholds in TypeScript alone. The alternative — encoding the bands in SQL — was rejected for splitting the thresholds across two languages. Authorized by the user as an explicit migration.
- **No change to the 7days/2weeks time-window model** and no change to the 30-day retention window. The size filter is a client-side narrowing over the corpus already fetched for the active format — it triggers no additional fetch.
- Affected areas: the metagame hook's filter inputs and derived totals, the sidebar filter group set, the Event filter's option list, the clear/reset controls, the trending computation's filter slice, and ES/EN locale files for the new group's labels.
- Blast radius is the dashboard's filter surface as a whole: adding a fifth selectable dimension touches every place that enumerates "the active filters", including the filters-active state that drives the Reset control's enabled/disabled rendering.
- User-visible: yes — a new sidebar control and new filtered states. Requires Vercel preview confirmation before merge.
- Known data consequence, accepted deliberately: with honest absolute thresholds, some bands are empty in some formats (Pioneer's largest event in the last 30 days was 57 players, so its Large and Massive bands are empty; Standard and Pre-Modern have no Massive events). Empty bands render with a zero count rather than being hidden.
