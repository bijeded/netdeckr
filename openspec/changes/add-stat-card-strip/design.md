## Context

`useMetagame(format, window, { eventId })` fetches the 2-week corpus once and derives the breakdown client-side; `App` renders the header (title + time-frame pill + freshness) and the grid. The header's `.app-content` header row is a `display:flex; alignItems:baseline` container holding the `<h1>` title and the window pill. The design's `StatCard` (`design/components/data/StatCard.jsx`) is a small right-aligned value+label box using existing tokens.

The strip needs three totals — events, distinct archetypes, decks — for the currently displayed corpus. Two of these aren't currently exposed: `deriveBreakdown` caps at the top-N and drops the raw per-archetype count, so App can't compute the distinct-archetype total or the deck total from the hook's outputs. The event count is already available (`events.length`), but for consistency all three come from one place.

## Goals / Non-Goals

**Goals:**
- A right-aligned header StatCard strip (Events · Archetypes · Decks) ported from the design component.
- Stats reflect the currently displayed corpus (whole window when unfiltered; narrowed by an event or archetype filter).
- Distinct archetype total (uncapped), honest even when the grid is capped.
- Localized labels; mono numerals with thousands separators.

**Non-Goals:**
- No change to the grid's top-N cap (a separate change).
- No schema/scraper/dependency change; no trending table or week-over-week delta.
- No change to the title, date pill, or freshness.

## Decisions

**1. Compute the totals in `useMetagame`, return `totals: { events, archetypes, decks }`.**
Over the same window+event-filtered deck set that feeds `deriveBreakdown`: `decks` = its length, `archetypes` = distinct archetype names in it (uncapped — independent of the top-N slice), `events` = distinct event ids in it. This keeps one source of truth and gives the uncapped archetype total the breakdown can't. Alternative — deriving in App from `breakdown`/`events` — fails because the breakdown is capped and count-dropped.

**2. The archetype filter is special-cased in `App`, not the hook.**
The event filter genuinely narrows the corpus, so the hook's `totals` already reflect it. The archetype filter is display-only (it does not narrow the derived breakdown), so when `archetypeName` is set, `App` overrides the strip from the isolated archetype's decks (`fullDecksByArchetype[name]`): Archetypes = 1, Decks = that list's length, Events = the count of distinct `eventName`/date among them. When no archetype filter is active, the strip uses the hook's `totals` verbatim.

**3. Port `StatCard` to `src/components/StatCard.tsx`.**
A typed `StatCard({ value, label, color?, style? })` mirroring the design box (right-aligned, `--surface-faint`, `--border-soft`, `--r-lg`, display font value + uppercase micro-label). Numbers are formatted with `toLocaleString()` for thousands separators, in the mono font (data-is-mono convention — the design uses `--font-display` for the value, but MetaStack's convention is mono for all data; use mono to match the rest of the app's numerals).

**4. Placement: right-aligned in the existing header title row.**
Wrap the strip in a flex container pushed right (`marginLeft: auto`) within the title row so the title stays left and the strip sits at the right edge, matching the design screenshot. The freshness line stays below, unchanged. On narrow viewports the strip wraps under the title (the row already uses `flexWrap`).

## Risks / Trade-offs

- **Archetype-filter Events count** requires distinct-event counting over the isolated archetype's decks → trivial (`new Set(decks.map(d => d.eventName + d.eventDate))`), but note deck rows carry `eventName`/`eventDate`, not event id; name+date is a safe distinct key within a format/window.
- **Responsive crowding** on small screens → the header row already wraps; the strip drops below the title rather than overflowing.
- **Mono vs. design font for the value** → deliberately using mono to match MetaStack's "all data is mono" rule rather than the design's display font; visually consistent with the rest of the app's numbers.

## Migration Plan

Pure additive frontend change, disciplined task groups, single or few PRs. No data migration; rollback = revert.

## Open Questions

None — stats set, corpus-reflecting behavior, distinct total, archetype-filter case, and placement are all decided.
