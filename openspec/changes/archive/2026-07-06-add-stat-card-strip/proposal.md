## Why

The metagame header shows the format title, time-frame pill, and freshness, but not the *size* of the metagame being shown. The design reserves a right-aligned header StatCard strip for exactly this — a fast "how much data am I looking at" read (events, archetypes, decks). All three numbers are already derivable from the corpus `useMetagame` fetches, so this is a small, high-payoff addition with no schema or scraper change.

## What Changes

- Add a **StatCard strip** to the header, **right-aligned** on the same row as the format title (title stays left; date pill and freshness unchanged): **Events · Archetypes · Decks**, ported from the design's `StatCard` component to real React + TS.
- The stats **reflect the currently displayed corpus**: with no event/archetype filter they report the whole (format, window) metagame; when an event or archetype filter is active they narrow to the filtered subset.
- **Archetypes** is the **distinct total** in the corpus (uncapped) — not the shown top-N — so it stays honest when the grid is capped.
- The **archetype filter** (which is display-only and does not narrow the derived breakdown) is special-cased so the strip reflects the isolated archetype: Archetypes = 1, Decks = that archetype's decks, Events = the distinct events among them.
- `useMetagame` gains a small **`totals: { events, archetypes, decks }`** derived over the same filtered corpus (the breakdown is capped and drops the raw count, so App can't compute these itself).
- Numbers render in mono with thousands separators (`1,284`); labels are localized (`stats.*`: Eventos/Arquetipos/Decks).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds a requirement for the header StatCard strip (which stats, corpus-reflecting behavior, distinct archetype total, archetype-filter special-case, right-aligned placement, localization).

## Impact

- Frontend only. New `src/components/StatCard.tsx` (+ test) ported from `design/components/data/StatCard.jsx`. `src/hooks/useMetagame.ts` returns a new `totals` object. `src/App.tsx` renders the strip in the header (right-aligned) and applies the archetype-filter special-case. New `stats.*` i18n keys in `es` + `en`.
- No schema, scraper, or dependency change. The grid's top-N cap is unrelated and handled by a separate change.
