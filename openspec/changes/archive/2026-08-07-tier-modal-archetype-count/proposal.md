## Why

The Tiers modal (opened from the Decks StatCard) shows only a deck count per tier, so it answers "how big is this tier's slice of the field" but not "how many distinct archetypes would I be looking at if I picked this tier". The archetype count is the figure that tells the player what a tier selection actually shows them — the grid renders one card per archetype, not per deck — and it is currently unavailable anywhere in the modal.

## What Changes

- Each row of the Tiers modal (the "All tiers" row and the T1/T2/T3/Rogue rows) shows **two** figures: the number of archetypes in that tier and the number of decks in that tier.
- The two figures occupy **separate aligned columns** — archetypes first, then decks — rather than being joined into a single string. The archetype column is reserved for the whole list so rows align down the modal, matching how the tier-badge column already works in the Archetypes modal.
- The existing deck count keeps its position, wording, and column; the archetype column is added to its left.
- Both figures are localized with i18next count-aware plurals (`1 archetype` / `7 archetypes`, `1 arquetipo` / `7 arquetipos`).
- The Events and Archetypes modals are unchanged — no row in either sets a second figure, so the new column never renders for them.
- The Decks StatCard's own number continues to be a deck count, and the Tiers modal's deck column still reconciles with it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: the "StatCard filter modals" requirement changes — the tier rows carry an archetype count alongside the deck count, in their own aligned column.

## Impact

- **Affected code**: `src/App.tsx` (tier row construction in the StatCard modal rows), `src/components/FilterModal.tsx` (row shape gains an optional second figure column, reserved list-wide), `src/styles/dashboard.css` (column sizing for the figure columns), `src/locales/en.json` and `src/locales/es.json` (new count-aware archetype-count strings).
- **Blast radius**: one modal. `FilterModal` is shared by all three StatCard modals, so the component change must be additive — the Events and Archetypes modals must render byte-identically. Their tests in `src/components/FilterModal.test.tsx` and `src/App.test.tsx` are the guard.
- **User-visible**: yes. Requires Vercel preview confirmation before merge, particularly for the narrow-viewport case where the modal row now carries two figure columns against a short tier label.
- **Not affected**: no Supabase tables, RLS policies, queries, or scraper behavior; no change to the 7days/2weeks window model or the 30-day retention window. Both figures are derived client-side from the breakdown and decks already loaded for the current view.
