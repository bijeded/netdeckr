## Context

The metagame breakdown is derived client-side from scraped decks: `useMetagame(format, window)` fetches the **2-week corpus once** (`gte events.event_date, windowStartISO('2weeks')` — 14 days) and the selected window is a client-side date subset. `deriveBreakdown` groups decks by archetype and computes `share = count / total`. Two performance signals already exist: a stable **tier badge** (2-week-anchored) and an arrow-only **performance trend** (`TrendIndicator`, Last 5 Days vs the 2-week baseline, number suppressed).

The design system ships a `ChangeIndicator` (arrow **+ number**) which the current `TrendIndicator` was ported from with the number stripped. This change reuses the number-shown form for a **popularity** delta.

Supabase retains **30 days** of decks (the prune deletes older). Because each scrape gathers the 2-week window and rows accumulate across runs, the DB already holds up to ~30 days of decks — enough to build an equal-length **preceding** slice for both dashboard windows without any schema, scraper, or history table. This is the key enabler and keeps the change within the project's "no long-term historical archive" constraint.

## Goals / Non-Goals

**Goals:**
- Show, per archetype card, a signed metagame-**share** delta: selected window vs the immediately-preceding equal-length window.
- Support both windows (5 days → prior 5 days; 2 weeks → prior 2 weeks), including the 2-week baseline view (which has no performance arrow today).
- Render arrow + signed pp value in the card stat footer, right-aligned opposite the share %.
- Add it **alongside** the existing performance trend arrow, with no change to shares, tiers, or that arrow.
- Frontend-only; localized aria-labels; deadband + minimum-deck guard so sparse/early data can't fake a spike.

**Non-Goals:**
- No stored history / snapshot table; no schema, scraper, or pipeline change.
- No change to metagame share %, Power Score, tiers, or the existing performance `TrendIndicator`.
- No delta for the trending-cards table (separate deferred work).
- No calendar-week semantics — the comparison is rolling equal-length windows, not ISO weeks.

## Decisions

**1. Two equal-length rolling slices, not calendar weeks or a snapshot.**
The selected window is `[now − N, now]` (N = `WINDOW_DAYS[window]`); the preceding window is `[now − 2N, now − N]`. For 5 days → `[−10, −5]`; for 2 weeks → `[−28, −14]`. Both fit inside 30-day retention. Alternative (stored weekly snapshot) was rejected: it adds a table + scraper write and conflicts with the retention rule, for no accuracy gain when the decks themselves are the history.

**2. Widen the fetch to the preceding extent (28 days), derive both slices client-side.**
Change the single `useMetagame` query's `gte` from `windowStartISO('2weeks')` (14d) to a 28-day start (2 × the 2-week window), so one fetch covers the selected corpus, its preceding slice, and the 5-day case. The selected-window derivation is unchanged (still a subset of the most-recent 2 weeks). A new pure helper derives the preceding-slice share per archetype by date-filtering the same rows. This mirrors the existing "fetch wide, filter client-side" pattern and adds one query-range edit, not a new request.
- *Share basis:* the delta compares share **within each window** (each window's `count / itsTotal`), consistent with how the breakdown already recomputes share within a scope (e.g. under the event filter). So a delta reflects a change in field proportion, not raw deck count.
- *Event filter interaction:* the share delta is computed over the window corpus **before** the display-only archetype filter and is **not** recomputed within a selected event (an event is a single point in time; a period-over-period delta within one event is meaningless). Simplest correct behavior: compute the delta from the unfiltered-by-event window corpus. (Recorded as an open question if product wants event-scoped deltas later.)

**3. Reuse the design `ChangeIndicator` as a new `ShareDelta` component; keep `TrendIndicator` untouched.**
The performance arrow stays exactly as-is (top-right cluster with the tier badge). The share delta is a distinct component rendered in the stat footer next to the share %, so the two signals never visually merge. Both derive from pure selectors; the component takes an explicit `{ direction, value }` and an aria-label, no data-shaping in JSX (per the Recharts/selectors convention).

**4. Deadband + minimum-deck guard, share-appropriate.**
Flat when `|delta| < DELTA_EPS` (a pp deadband, e.g. 0.5 pp — tuned for share, not the 0.02 finish-quality deadband). Suppress entirely (render nothing) when the **preceding** slice has fewer than `MIN_PREV_DECKS` total decks for the field, so early data (no full preceding period yet) or an empty preceding window doesn't manufacture a delta. An archetype absent in the preceding slice but present now, with the preceding field otherwise populated, is a genuine ▲ of its full current share. Constants sit at the top of the selector module alongside the existing calibration constants.

## Risks / Trade-offs

- **Preceding slice thin early in a format's life** → guard by `MIN_PREV_DECKS`; suppress rather than show a misleading spike. Verified live read-only before shipping.
- **28-day fetch is larger than 14-day** (≈2× rows) → still one query, decks-only columns already selected; acceptable. If payload becomes a concern, a follow-up can push slicing to an RPC (same note as the trending-table deferral).
- **Two arrows on one card could confuse** → mitigated by placement (performance arrow top-right by tier; share delta bottom-right by the %), distinct aria-labels, and the number (only the share delta shows a value).
- **Share vs count intuition** → the delta is a share (pp) change; documented in the aria-label copy so "▲ +2.1" reads as "+2.1 percentage points of the field."

## Migration Plan

Pure frontend; deploys with the merge (Vercel). No schema/scraper step, no backfill. Rollback = revert the PR. Verified read-only against live Supabase across all five formats before merge (both windows; sparse-preceding suppression; a known riser/faller).

## Open Questions

- **Deadband value (`DELTA_EPS`) and `MIN_PREV_DECKS`** — start at ~0.5 pp and 3–5 decks respectively; confirm during live verification. Property tests won't depend on exact values.
- **Event-scoped delta** — currently out of scope (delta uses the window corpus, ignores the event filter). Revisit only if product wants "share change within this recurring event series," which needs different semantics.
