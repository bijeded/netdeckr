# Proposal

## Why

The dashboard answers "what is the field playing" but never "who is doing well in it". Pilot names are already on every deck, yet there is no way to see the players who keep showing up or keep winning, or to look at everything one of them played. A player search alone would not answer that: ~85% of pilots in a 2-week window have a single deck, and users rarely know a handle to type. Ranked lists of the players with **2+ events** solve both problems: 19–156 such players per format in the 2-week window, measured on live data.

## What Changes

- New **Players view** (`?v=players`), entered from a navigation row in a new "Explore" section of the sidebar, placed below "Clear filters" and visually distinct from the filter controls. On mobile, using it closes the drawer.
- The Players view toggles between two top-10 rankings of the players with 2+ distinct events in the active format and window:
  - **Top Players**: ranked by a per-player Power Score built from the existing Power Score math (event-size-weighted finish quality, small-sample discount). Only the rank is shown, never the score.
  - **Top Grinders**: ranked by distinct events played.
  - Both show events played and wins.
- New **Player view** (`?p=<name>`): every deck that player played in the active format and window, most recent first, each opening the existing decklist modal.
- The player name in the decklist modal becomes a link to that player's Player view.
- In the Players and Player views, the window, event-size, archetype and tier filters still apply (an isolated archetype gives "top pilots of X"). The Event filter is disabled there, because one event per player makes the rankings meaningless. Its selection is kept and applies again on return to the dashboard. "Clear filters" does not leave the view.
- Player identity is case-insensitive (e.g. `Moxlessguy` / `MoxlessGuy` count as one player). Names are shown with their most common spelling.
- Out of scope: player search, cross-format player views, any backend change.

## Capabilities

### New Capabilities
- `players-view`: the Players view and its two rankings, the per-player Player view, how both are entered, left and persisted in the URL, how the sidebar filters apply inside them, and how player identity is grouped.

### Modified Capabilities
- `archetype-decklists-view`: the decklist modal's player name becomes a link to that player's Player view.

## Impact

- **Frontend only.** The rankings and player decks are derived client-side from the deck corpus `useMetagame` already fetches (`decks.player` is already selected), with no additional request.
- **Supabase / RLS / scraper:** none. No tables, policies, RPCs or scraper behavior change.
- **Time windows / retention:** unchanged. The views follow the selected `7days`/`2weeks` window over the existing 30-day retention.
- **Affected areas:** the sidebar (new navigation section), the main column's view switching and URL state alongside `?f=`/`?w=`/`?a=`, the decklist modal header, Power Score helpers (reused, not changed), and ES/EN locale files.
- **User-visible:** yes. The change needs confirmation on the Vercel preview before merge.
