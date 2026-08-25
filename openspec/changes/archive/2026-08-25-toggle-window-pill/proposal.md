## Why

The window pill next to the format title already names the active time frame, but it is inert: the only way to change the window is the "Time Frame" group in the filter sidebar, which is collapsed behind the ≡ button on mobile. Making the pill itself the toggle gives the most-used filter a one-tap path at the top of the page, where the user is already looking.

## What Changes

- The window pill on the format-title row becomes an interactive toggle. Activating it swaps the window between `7days` and `2weeks` — with exactly two windows, one control needs no menu.
- The pill keeps naming the **current** window and gains a directional glyph that names the move: `Last 7 days →` (activating widens to 2 weeks), `← Last 2 weeks` (activating narrows back to 7 days). Glyphs are from the project's sanctioned set.
- The pill gains real control affordance: pointer cursor, hover state, and a visible focus ring; the action (not the state) is carried in its accessible name, so the visible label stays the state.
- The sidebar time-frame selector stays exactly as it is. Both controls read and write the same `?w=` selection, so they never disagree.
- No change to the window model itself: same two logical keys, same client-side date filter over the already-fetched corpus, so the swap needs no refetch.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `metagame-breakdown-view`: the time-frame filter requirement gains a second entry point — a toggle on the title row — with its own label, glyph-direction, localization, and accessibility behavior.

## Impact

- `src/App.tsx` — the `window-pill` element on the format-header row (currently a `<span>`), and its wiring to the existing `setWindow` from `useWindowSelection`.
- `src/locales/es.json`, `src/locales/en.json` — the pill's accessible-name strings.
- `src/App.test.tsx` — the three existing `window-pill` text assertions take the glyph (`Last 7 days →`), plus new coverage for the toggle.
- No Supabase table, RLS policy, or scraper behavior is touched. The 7days/2weeks window model and the 30-day retention window are unchanged.
- User-visible change on every dashboard page, so it needs Vercel-preview confirmation before merge.
