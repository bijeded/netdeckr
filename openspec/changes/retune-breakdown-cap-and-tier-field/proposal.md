## Why

Today `TOP_N = 20` in `src/lib/metagame.ts` does double duty: it caps the grid AND is the Fisher–Jenks reference field for tiers, and the same cap silently limits the Archetype filter dropdown to the top 20 — so fringe archetypes can't be isolated, and tiers rank an archetype only against the head of the field. The default grid is also longer than it needs to be for a quick "what's popular" read, and there is no way to browse the metagame by performance tier.

## What Changes

- Shrink the default (time-frame-only, unfiltered) archetype grid from top-20 to **top-12**, and add a localized caption **"Top N most popular archetypes"** (N = displayed count, ≤ 12) above the "Updated X ago" freshness line.
- **Decouple the display cap from the tier reference field**: the grid cap (12) becomes one constant; the Fisher–Jenks tier field becomes the **whole 2-week corpus (uncapped)**, so every archetype is tiered against the full metagame. **BREAKING** (behavioral): re-tiers every card in every view — verify tier distribution against live data during implementation.
- **Uncap the Archetype filter dropdown**: list every archetype in the corpus (or every archetype within the selected event), not just the top 20.
- **New "Tiers" filter** in the sidebar after the Archetype filter, with options All / Tier 1 / Tier 2 / Tier 3 / Rogue-Otros (the four map to the existing T1/T2/T3/Otros tiers). Selecting a tier shows **all** that tier's archetypes as normal collapsible (click-to-expand) cards, uncapped; the popularity caption is hidden (the view is no longer a popularity top-N). It ANDs with the Event filter (shares recomputed within the event).
- **Filter combination rules**: the Archetype filter (isolate one card) wins over the Tier filter — if the chosen archetype falls outside the selected tier, the Tier filter silently auto-resets to All (mirroring the existing invalid-selection auto-reset). A Tier selection that matches no archetypes after a format/window/event change silently auto-resets; a tier matching no archetypes under the combined filters shows a localized empty state; "Clear filters" resets Event/Archetype/Tier and returns the default top-12 caption view.

No schema, scraper, or dependency change — everything derives client-side from the already-fetched 2-week corpus.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: grid display cap (20 → 12) + popularity caption; tier reference field decoupled to the whole 2-week corpus; Archetype filter option list uncapped; new Tier filter with its combination/auto-reset/empty-state rules.

## Impact

- `src/lib/metagame.ts` — split `TOP_N` into a grid display cap and an uncapped tier field; attach tiers to the full breakdown so the Tier filter and beyond-top-12 cards carry a badge.
- `src/hooks/useMetagame.ts` — expose an uncapped, tiered breakdown and an uncapped archetype-name list for the dropdown.
- `src/App.tsx` — top-12 default cap, popularity caption, Tier filter state + combination/auto-reset wiring, Tier-filtered grid rendering.
- New `src/components/TierSelector.tsx` (mirrors `ArchetypeSelector`); `filters.tier.*` + caption i18n keys in `src/locales` (ES/EN) with a locale-parity test.
- No changes to schema, the scraper, Power-Score math, the win trophy, the StatCard totals (Archetypes stays the true distinct count), or dependencies.
