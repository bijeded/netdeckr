## Why

The metagame view can only be narrowed by format and time frame today. Players analyzing a specific tournament, or focusing on one archetype's decks, have to scan the whole grid manually. The design's filter sidebar already reserves "Evento" and "Arquetipo" groups, and the `events`/`decks` tables already store the full corpus — so the data to power these filters is already present with no scraper or schema change.

## What Changes

- Add an **Event filter** group to the existing filter sidebar: a single-event select listing the events present in the current (format, window) — each shown by name + abbreviated date — defaulting to "All events". Selecting one restricts the derived breakdown and decks to that event, and each archetype's percentage is recomputed as its share within that event.
- Add an **Archetype filter** group: single-select that collapses the grid to only the chosen archetype's card, defaulting to "All archetypes". The isolated card **auto-expands** and lists **all** of that archetype's decks under the combined filters (display cap lifted), by event and date, most-recent-first.
- **Combine (AND)** event + archetype + the existing time-frame filter over the active format; the breakdown re-derives from the filtered deck subset.
- **Auto-reset** a filter group to its "All" default when its selection is no longer valid after a format/window/other-filter change (silent, no stale selection). An archetype filter yielding no decks shows a localized empty state.
- Provide **both** per-group "All events"/"All archetypes" defaults and a global **"Clear filters"** button that resets event + archetype at once.
- Selections are **in-memory only** (no URL params); reset on reload.
- All new UI strings via react-i18next (ES/EN); MTG proper nouns stay English in both locales. New groups live inside the existing collapsible sidebar/drawer, following the `WindowSelector` pattern and design tokens.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds requirements for an event filter, an archetype filter, their AND-combination with the existing time-frame filter, auto-reset of invalid selections, and clear-filter controls — all deriving the breakdown from the filtered deck subset.

## Impact

- Frontend only. New filter components (event select, archetype select, clear-filters control) in `src/components/`, mounted in `src/App.tsx`'s sidebar beside `WindowSelector`.
- `useMetagame` (or a thin selector over it) gains event + archetype filter parameters applied client-side over the already-fetched 2-week deck corpus.
- New `filters.*` i18n keys in `src/locales/es` + `en`.
- No schema, scraper, or dependency change; browser stays read-only.
