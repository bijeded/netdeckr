## Why

Players can see how popular an archetype is *right now* (its metagame share %), but not whether that popularity is **rising or falling** period-over-period. The existing trend arrow only measures *performance* momentum (Last 5 Days vs the 2-week baseline) and shows nothing on the 2-week view. A true period-over-period **share** delta answers "is this deck gaining or losing ground in the field?" — the single most-asked metagame question — and it is derivable client-side from decks we already retain (30 days), with no schema, scraper, or history table.

## What Changes

- Add a **period-over-period metagame-share delta** to each archetype card: the archetype's share in the selected window versus its share in the **immediately-preceding, equal-length** window.
  - **Last 5 Days** view → days 0–5 vs days 6–10.
  - **2 Weeks** view → last ~15 days vs days 16–30.
- Render it as an **arrow + signed value** (▲ +2.1 / ▼ -1.7 / – flat, in percentage points, one decimal, mono) in the card's **stat footer, right-aligned opposite the share %** it describes. This reuses the design's `ChangeIndicator` (the number-shown sibling of the existing arrow-only `TrendIndicator`).
- Show it on **both** windows — including the 2-week baseline view, which currently has no arrow at all — **alongside** (not replacing) the existing top-right performance-momentum arrow.
- Widen the frontend deck fetch from ~14 days to **30 days** so the preceding slice is available; the accumulated decks in Supabase already span up to the 30-day retention. This is a **query-range change only**.
- Suppress the delta (show nothing) when the preceding slice lacks enough data to compare (below a minimum-deck guard, or empty because the DB does not yet hold a full 30 days), and apply a deadband so a negligible change reads as flat. Metagame share % values themselves are **unchanged** (the delta is additive and read-only).
- New copy is **aria-labels only**, localized ES/EN.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds a period-over-period metagame-share delta indicator on archetype cards (new requirement), shown on both windows alongside the existing performance-trend arrow; and widens the deck-fetch range to 30 days to source the preceding comparison slice.

## Impact

- **Frontend only.** No schema, scraper, pipeline, or dependency change.
- `src/hooks/useMetagame.ts` — widen the deck fetch date range to 30 days; expose per-archetype current + preceding-window share for the selected window.
- `src/lib/metagame.ts` (and/or a small pure selector) — compute the two equal-length slices and the signed share delta with deadband + minimum-deck guard.
- `src/components/` — port/reuse the design `ChangeIndicator` (arrow + number) as a `ShareDelta` indicator; render it in `ArchetypeCard`'s stat footer next to the share %.
- `src/locales/es|en` — new `shareDelta.*` aria-label keys (locale-parity test).
- Stays entirely within the 30-day retention window: no data persisted beyond it, no historical archive added (respects the "no long-term historical archive" project constraint).
