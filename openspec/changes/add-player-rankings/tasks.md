# Tasks

## 1. Player data derivation

- [x] 1.1 Extend `useMetagame` to return `playerCorpus`: decks passing the window and size filters but not the event filter, each with `eventId`, `playerCount` and the projected `unranked` flag (design §1). Verify with new `useMetagame.test.tsx` cases: an event filter leaves `playerCorpus` unchanged, a size class narrows it, the 7-day window shrinks it, and an unranked event's decks carry `unranked: true`. Existing tests stay green.
- [x] 1.2 Add `src/lib/players.ts` with `playerKey`, `groupPlayers`, `rankTopPlayers` and `rankTopGrinders`, reusing `archetypePowerScore` (design §3). Verify with `players.test.ts`, one test per players-view scenario under "Player identity", "Ranking eligibility", "Top Players ranking" and "Top Grinders ranking": case merge, most-common spelling with recency tie-break, empty names excluded, the 2-distinct-event minimum, two decks in one event counting once, size weighting, unranked handling, both tie-break chains, and the top-10 cap.

## 2. View URL state

- [x] 2.1 Add `usePlayerViewSelection` owning `?v=`/`?p=` with push markers and `leave` (design §4). Verify with `usePlayerViewSelection.test.tsx`: shared `?v=players` and `?v=players&p=` links are read; names with spaces and `/` round-trip; an unknown `?v=` is dropped; `leave` steps back only on a pushed entry and clears in place otherwise; `?f=`/`?w=`/`?a=` are preserved on every write.

## 3. Players and Player views

- [x] 3.1 Build `ExploreNav`, `PlayersView`, `PlayerRankingRow` and `PlayerView`; add the `lead` prop to `DeckCard`; add `onPlayerSelect` to `DecklistModal` and `disabled` to `EventSelector` (design §5–8). Add every new string to `src/locales/en.json` and `es.json` ("Top Jugadores" / "Top Grinders", empty states, "← Metagame", "← Back", the player-link accessible label). Verify with component tests covering the players-view "Players view layout" and "Player view" scenarios and the archetype-decklists-view modal-link scenarios (link opens the view, plain text in the player's own view, keyboard activation, localized label). Verify that `DeckCard` with the default `lead` renders as before.
- [x] 3.2 Wire the views into `App.tsx`: branch the main column on `?v=players`, pass `playerCorpus` narrowed by the trending archetype-name resolution, disable the Event filter in the views while keeping its selection, clear `?p=` on format change, keep the view on "Clear filters", and close the drawer on narrow viewports when the nav row is used. Verify with `App` tests for the "Filters inside the player views" and "Player views persisted in the URL" scenarios: top pilots of an isolated archetype, the tier filter applies, the event filter is disabled but survives a round trip, Clear filters stays in the view, a format switch keeps the Players view, and Back from a Player view goes to the Players view and then to the dashboard.

## 4. Integration and preview

- [x] 4.1 Run `npm run lint`, `npm run type-check` and `npm run test`; all pass.
- [ ] 4.2 Push the `task/add-player-rankings` branch and open a PR. Confirm on the Vercel preview, desktop and phone: the nav row reads as navigation rather than a filter, the ranking layout, the defaults from design §10 (tier applies, drawer-only mobile entry), and the open question about the most-played archetype. Record the confirmed visual values in design.md §9. Do not merge until the user approves: user-visible change, CLAUDE.md exception 1.

## Workflow follow-up

- After approval and merge: `/opsx:sync` the delta specs, then `/opsx:archive`.
- If the preview is rejected: close the PR, delete the branch, and remove this change directory.
