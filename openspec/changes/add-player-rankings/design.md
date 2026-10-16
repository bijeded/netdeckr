# Design

## Context

See proposal.md (Why) and `specs/players-view/spec.md` for behavior.

- `useMetagame` fetches the active format's 28-day deck corpus once (`fetchCorpusDecks`, already selecting `player`, `events.id`, `events.player_count`) and walks it in one loop, applying window, size and event filters inline. Archetype and tier filters are applied by `App.tsx`, not by the hook.
- The per-event unranked test (`isUnrankedEvent`) is already resolved inside that loop from `eventFacts`, which covers every fetched row.
- `archetypePowerScore(placements, sizes, unranked)` in `src/lib/powerScore.ts` is generic over a list of finishes. Nothing in it is archetype-specific apart from the name.
- `useArchetypeSelection` is the existing URL-state pattern: it reads `?a=`, writes via `replaceState` by default, `pushState` with a history marker for navigation entry points, and has a `leave` that steps back only on an entry it pushed.
- `DeckCard` is one `<button>` for the whole row, so it cannot contain a second interactive element (a nested player link would be invalid HTML).
- `App.tsx` is ~860 lines and owns all filter state.

## Goals / Non-Goals

**Goals:**
- Derive both rankings and the Player view from data already in memory, with no new request.
- One source for "the player subset" so ranking counts and Player view deck lists can never disagree.
- Keep `App.tsx` growth to wiring; the view logic lives in its own modules.

**Non-Goals:**
- No change to the Power Score math or its constants. Per-player tuning, if the preview shows it is needed, is a follow-up change.
- No player link inside `DeckCard` rows (see Decision 6).

## Decisions

### 1. A window-level, event-agnostic deck list from `useMetagame`
The hook additionally returns `playerCorpus`: every legal deck that passes the **window and size** filters but **not** the event filter, each carrying `eventId`, `playerCount`, `unranked` and the existing `DeckRow` fields. It is filled in the same loop that already computes `passesSize`/`inWindow`, and `unranked` is projected after the loop from `unrankedEventIds`, as `twoWeekUnranked` already is.

Alternative considered: call `useMetagame` with `eventId: null` while in the Players view. Rejected because it would recompute (and, depending on effect deps, refetch) the whole dashboard on every view switch, and the dashboard's event-filtered state must survive the round trip.

**Superseded in part during apply:** `App.tsx` *does* pass `eventId: null` to `useMetagame` while the player views are open. What overturned the rejection: under an event filter `breakdown` is event-narrowed, so the tier filter (Decision 2) would resolve only that event's archetypes, and the Archetype options would shrink the same way. The cost is smaller than feared. The stored `eventId` is untouched, so it survives the round trip, and a refetch happens only when an event filter is set (otherwise the argument doesn't change). `playerCorpus` stays: the event-agnostic deck list with `eventId`/`unranked` is still what the selectors need.

### 2. Archetype/tier narrowing applied by the caller, as today
`App.tsx` already resolves the active archetype names for trending (`trendingArchetypeNames`: isolated archetype, tier members, or null). The players selectors take the same list, so "top pilots of X" and the tier rule reuse one resolution and cannot drift from the trending tables.

### 3. Pure selectors in `src/lib/players.ts`
- `playerKey(name)`: `name.trim().toLowerCase()`, or `null` for an empty name.
- `groupPlayers(decks)`: key → { displayName, decks, eventIds, wins }. The display name is the most frequent spelling, ties going to the spelling on the most recent deck.
- `rankTopPlayers` / `rankTopGrinders(groups, limit = 10)`: keep groups with `eventIds.size >= 2`, then sort as specified.
- Top Players score: `archetypePowerScore` over the player's finishes (placements, sizes, unranked flags) with the default z. It is called directly rather than duplicated. A thin `playerPowerScore` alias in `players.ts` documents the reuse without renaming the shared function.

Wins count 1st places at **ranked** events only. A league "1" is a publication position, not a win, so it is excluded, matching how the score already flattens those finishes. Found during apply: the archetype trophy counts every "1", but for a person "3 wins" makes a claim about them that a ladder listing doesn't support.

Normalization is case and whitespace only. Merging `Bruno Guerra` / `BrunoGuerra` would need punctuation and space stripping, which risks merging two different people. A split player is a smaller error than a false merge.

### 4. URL state: `usePlayerViewSelection`
A new hook modeled on `useArchetypeSelection` owns `?v=` and `?p=`: it reads them on load, exposes `openPlayers({ push })`, `openPlayer(name, { push })` and `leave()`, and marks entries it pushed so `leave` steps back only on those. `?p=` stores the display name as clicked and is matched by `playerKey`, so case differences in a shared link still resolve. On a format change `App.tsx` clears `?p=` but keeps `?v=players`; an unknown `?v=` is dropped on read.

Alternative considered: a router. Rejected because the app is otherwise router-free and `?a=` already sets the pattern.

### 5. View switching and filters in `App.tsx`
While `?v=players` is set, the main column below the format title row renders `PlayersView` or `PlayerView` instead of the StatCards, grid and trending tables. The sidebar keeps every filter. `EventSelector` gains a `disabled` prop; the stored `eventId` is untouched and simply not passed to the players selectors. "Clear filters" calls the same `clearFilters`, which does not touch `?v=`/`?p=`.

### 6. Player link only in the decklist modal
`DecklistModal` gains `onPlayerSelect?: (name: string) => void`. When it is provided, the name renders as a link-styled button that closes the modal and calls it; when absent (the Player view passes nothing for its own player), it stays plain text.

Alternative considered: a link on each `DeckCard` row. Rejected for v1: the row is a single button, and splitting it into two sibling targets changes the hit area and focus order of every deck row in the app. The modal is one tap away from every row.

### 7. Player view rows reuse `DeckCard`
`DeckCard` gains a `lead: 'player' | 'archetype'` prop (default `'player'`, unchanged rendering). The Player view uses `'archetype'`: archetype name and pips where the player name is now, since the player is the page's subject.

### 8. New components
`ExploreNav.tsx` (sidebar section + "Players →" row), `PlayersView.tsx` (back control, toggle, ranking list), `PlayerRankingRow.tsx`, `PlayerView.tsx`. The toggle reuses the existing chip treatment from `chipBase.ts`; wins reuse `WinTrophy`.

### 9. Visual treatment (pending visual confirmation)
These are intentions, not measured outcomes. The values get set on the Vercel preview and recorded here once confirmed:
- The navigation row's divider, heading weight, full-width row with `→`, and accent-colored active state. The goal is that it reads as navigation rather than a filter; only the preview can confirm that.
- Ranking row density, column alignment of events/wins in JetBrains Mono, and the toggle's placement relative to the "← Metagame" control.
- Mobile layout of ranking rows at ~360px.

Calculated: all new text sits on `--surface-card`/`--bg-app`, never over card art, so the card-art contrast rule does not apply.

### 10. Defaults chosen without a decision (pending preview)
- The Tier filter **applies** in the player views (rather than being disabled), for consistency with the archetype filter.
- Mobile entry is the **drawer only** (no topbar entry).

Both are cheap to reverse if the preview argues otherwise.

## Risks / Trade-offs

- [Top Players order is noisy at 2–3 events, and the 7-day window makes it thinner] → The small-sample adjustment already discounts low counts. The 2-event minimum removes single-event winners. The empty state covers formats with nobody eligible (Pioneer is the likely case on 7 days).
- [Top Grinders surfaces MTGO league volume more than paper results] → This is intended: that is what a grinder is. Distinct-event counting stops one league publication from counting as several events.
- [Case-insensitive merging conflates two different people who differ only by case] → Accepted. On live data every case collision looked like the same person.
- [`App.tsx` grows further] → The view logic lives in the new hook, the lib module and the components; `App.tsx` only gets view-mode branching and prop wiring.
- [The rankings can drift from the Player view] → Both derive from the same `playerCorpus` + archetype-name narrowing + `groupPlayers`. The Player view reads its group from the same result rather than re-filtering.

## Migration Plan

No data or schema migration. Ship on a feature branch and confirm on the Vercel preview (user-visible, CLAUDE.md exception 1, not merged without approval). If the preview is rejected, close the PR and delete the branch. Production is untouched until merge. After merge, rollback is a revert of the PR.

### 11. Most-played archetype in ranking rows
This resolves the former open question: after reviewing the preview, the user asked for it. `groupPlayers` adds `topArchetype` (name + color identity), picked by the same most-common-with-recency-tie-break rule as the display name, through one shared `mostCommon` helper. The row stacks it under the name as a faint secondary line with pips, so the name stays the row's lead and the events/wins columns keep their alignment. Pending visual confirmation on the preview.

Known redundancy: with an archetype isolated, every row repeats that archetype. It is kept for now (it confirms the narrowing). If it reads as noise on the preview, it can be hidden in that state.
