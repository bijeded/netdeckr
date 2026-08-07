## Why

The Events / Archetypes / Decks StatCards look clickable and users have reported trying to click them, but they are inert readouts. Meanwhile the filters that would answer "which events?", "which archetypes?", "which tiers?" live only in the sidebar — which is a collapsed drawer on mobile, so the filtered state is both hard to reach and invisible once set. Clearing filters has the same problem: `Clear filters` is buried in that drawer, so a user who has filtered down to an empty grid has no visible way back.

## What Changes

- Each of the three header StatCards becomes an interactive trigger that opens a modal listing the options for one filter: Events → event filter, Archetypes → archetype filter, Decks → tier filter.
- Each modal presents the breakdown of the number shown on its card — event rows carry their deck count, archetype rows their share and tier, tier rows their deck count — so the rows account for the card's total. Picking a row applies that filter and closes the modal.
- Every modal's first row is an "All …" option that clears just that filter.
- A StatCard with an active filter shows the selected value beneath its label; unfiltered cards are unchanged.
- A `Reset` button is added to the main window on the grid caption row, right-aligned, clearing all three filters at once. It is always present and disabled when no filter is active.
- The sidebar selects and the modals stay two views over the same filter state: choosing in one is immediately reflected in the other. The sidebar's existing `Clear filters` button stays.
- No search or filtering inside the modals — rows keep the ordering they already have (archetypes by share descending, events by date descending).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: the header StatCard strip gains interactive behavior (opening a per-card filter modal and displaying the active filter value), the three existing filters gain a second equivalent entry point, and clearing filters gains a main-window control alongside the sidebar one.

## Impact

- **Frontend only.** `src/components/StatCard.tsx` (gains an interactive variant), a new filter-modal component and its stylesheet rules in `src/styles/dashboard.css`, and `src/App.tsx` where the filter state and the caption row live. New i18n keys in `src/locales/es` and `src/locales/en`.
- **Blast radius:** the dashboard header and the grid caption row. The archetype grid, trending tables, deck modal, and legal pages are untouched. The existing sidebar filters keep their current behavior.
- **Data layer:** none. No Supabase tables, RLS policies, queries, or scraper behavior change; every value the modals display is already computed client-side from the loaded decks. No change to the 7days/2weeks window model or the 30-day retention window.
- **User-visible:** yes — requires Vercel preview confirmation before merge.
