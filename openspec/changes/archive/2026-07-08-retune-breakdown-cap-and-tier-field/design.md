## Context

The metagame breakdown is derived client-side in `src/lib/metagame.ts` from the 2-week deck corpus fetched once by `useMetagame`. Today a single constant `TOP_N = 20` in `deriveBreakdown` both caps the displayed grid AND, via `useMetagame` computing `twoWeekTopNames = deriveBreakdown(twoWeekForBreakdown)`, defines the Fisher–Jenks reference field for tiers. The Archetype filter dropdown is fed from `breakdown.map(a => a.name)` in `App.tsx`, so it inherits the same 20-cap. `attachPowerTiers` only attaches a tier to the *displayed* (capped) breakdown, so archetypes below the cap have no tier at all.

This change decouples the display cap from the tier field, shrinks the grid to 12, uncaps the archetype dropdown, and adds a Tier filter — all of which need tiers and names for archetypes *beyond* the displayed slice.

## Goals / Non-Goals

**Goals:**
- Grid default cap 12; tier reference field = whole 2-week corpus (uncapped); two distinct constants.
- Every archetype (not just the top 12) carries a tier, so the Tier filter and beyond-cap cards can render a badge and group by tier.
- Archetype dropdown lists every archetype in the (event-scoped) corpus.
- A Tier filter that shows all of a tier's archetypes as collapsible cards, ANDs with the event filter, and yields to the archetype filter.
- Popularity caption above the freshness line.

**Non-Goals:**
- No schema/scraper/dependency change; no change to Power-Score math, win trophy, trend arrow, or StatCard totals.
- No URL persistence of the tier filter (in-memory, like the others).
- No new tier concept — "Rogue/Otros" is just a label for the existing `Otros` tier.

## Decisions

**1. Split `TOP_N` into `GRID_DISPLAY_CAP = 12` and an uncapped tier field.**
`deriveBreakdown` gains an optional cap parameter (default uncapped) and returns the full ranked list; the top-12 slice happens for display, while the tier reference field uses the full list. Rationale: keeps `deriveBreakdown` a pure ranker and makes the two uses explicit. Alternative (two separate functions) rejected as duplicative.

**2. `useMetagame` returns the full tiered breakdown; `App` slices for display.**
`attachPowerTiers` runs over the *entire* ranked breakdown (not the capped slice), so `breakdown` carries a tier for every archetype. The reference field passed in becomes the full 2-week corpus names. `App` derives the default grid as `breakdown.slice(0, 12)`, the archetype dropdown from `breakdown.map(a => a.name)` (now full), and the tier-filtered grid as `breakdown.filter(a => a.tier === selectedTier)`. Rationale: a single tiered list is the natural home for all three consumers; avoids a second pass. The StatCard `archetypes` total already comes from `totals` (distinct count), untouched.

**3. Tier filter is display-only over the already-tiered breakdown — like the archetype filter.**
No new fetch or hook param. `App` holds `tier` state (`Tier | null`), a `TierSelector` mirrors `ArchetypeSelector`, and the visible grid is chosen by: archetype filter (isolate one) > tier filter (filter by tier, collapsible) > default (top 12). Rationale: tiers are already attached client-side; filtering is pure array work.

**4. Precedence & auto-reset via effects, mirroring existing patterns.**
Archetype wins over tier: an effect resets `tier` to null when an archetype is selected that isn't in the current tier. A second effect resets `tier` when no archetype in `breakdown` carries it (after format/window/event change). These mirror the existing `eventId`/`archetypeName` auto-reset effects in `App.tsx`.

**5. Caption is a small localized line above freshness.**
`t('dashboard.topCaption', { count: n })` where `n = visibleBreakdown.length`, rendered only when neither the tier nor archetype filter is active (i.e. the popularity default view). Hidden otherwise.

## Risks / Trade-offs

- **Feeding the long tail of single-deck archetypes into Jenks shifts the T1/T2/T3/Otros breaks (likely more Otros).** → Verify the tier distribution against live Supabase across all five formats during implementation (property tests won't catch a "feels off" distribution); this is an explicit acceptance step, not just unit tests.
- **Re-tiering every card is a behavioral BREAKING change** — badges on existing cards may move. → Expected and intended (tiers now rank against the full field); called out in the proposal and verified live.
- **Tier filter can render a long, uncapped grid** for a large tier. → Cards are collapsed by default (decided), so the DOM cost is bounded to card headers; consistent with the "collapsed cards" product decision.
- **Empty Jenks field / fewer than 4 clusters** already handled by `assignTiers`; uncapping only enlarges the field, so no new edge case there.

## Migration Plan

Pure frontend, single PR set in disciplined mode. No schema/scraper deploy dance. Rollback = revert the PR(s). Live verification of tier distribution before archive.
