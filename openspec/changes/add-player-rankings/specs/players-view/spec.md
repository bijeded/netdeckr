# Spec Delta

## Purpose

Lets users discover the players who perform best or play most in a format's recent tournaments, and browse every deck a single player registered in the selected window.

## ADDED Requirements

### Requirement: Players navigation entry in the sidebar
The sidebar SHALL contain a localized "Explore" section below "Clear filters", separated from the filter groups, holding a "Players →" navigation row. The row SHALL read as navigation, not as a filter control, and SHALL show an active state while the Players view or a Player view is open. Activating it SHALL open the Players view; on a narrow viewport it SHALL also close the sidebar drawer.

#### Scenario: Navigation row sits apart from the filters
- **WHEN** the sidebar renders
- **THEN** a "Players →" row appears under an "Explore" heading below "Clear filters", separated from the filter groups, and it is not a select, chip, or other filter control

#### Scenario: Row opens the Players view
- **WHEN** the user activates the "Players →" row from the dashboard
- **THEN** the main column shows the Players view and the URL carries `?v=players`, preserving `?f=`, `?w=` and any `?a=`

#### Scenario: Row shows its active state
- **WHEN** the Players view or a Player view is open
- **THEN** the "Players →" row is rendered in its active state

#### Scenario: Drawer closes on mobile
- **WHEN** the viewport is narrow, the sidebar drawer is open, and the user activates "Players →"
- **THEN** the drawer closes and the Players view is visible

### Requirement: Player identity
Players SHALL be identified by their pilot name compared case-insensitively and ignoring surrounding whitespace, within the active format. Decks whose pilot name is empty SHALL belong to no player. A player SHALL be displayed under the spelling used on most of their decks in the active view, ties going to the spelling on their most recent deck.

#### Scenario: Case variants are one player
- **WHEN** the active window holds decks piloted by "MoxlessGuy" and "Moxlessguy"
- **THEN** they are counted, ranked and listed as a single player

#### Scenario: Most common spelling is shown
- **WHEN** a player has three decks as "MoxlessGuy" and one as "Moxlessguy"
- **THEN** the player is displayed as "MoxlessGuy"

#### Scenario: Unnamed decks belong to no player
- **WHEN** a deck has an empty pilot name
- **THEN** it is excluded from both rankings and from every Player view

### Requirement: Ranking eligibility
Both rankings SHALL include only players with decks in at least 2 distinct events in the deck subset the Players view applies (see "Filters inside the player views"). Events SHALL be counted as distinct events, not decks, so two decks a player registered in one event count as one event.

#### Scenario: Single-event players are excluded
- **WHEN** a player has decks in only one event of the active subset, even if that deck won the event
- **THEN** the player appears in neither ranking

#### Scenario: Two decks in one event count once
- **WHEN** a player has two decks in event A and one deck in event B
- **THEN** the player is credited with 2 events and is eligible

### Requirement: Top Players ranking
The Top Players ranking SHALL order eligible players by a performance score computed over their finishes in the active subset with the same finish-quality, tournament-size weighting, unranked-event handling and small-sample adjustment as the archetype Power Score. Ties SHALL break by more events, then more wins, then name. The score itself SHALL NOT be displayed.

#### Scenario: Deeper finishes rank higher
- **WHEN** two eligible players have the same number of events at events of equal size, and one has better finishes
- **THEN** the player with better finishes ranks higher

#### Scenario: Results at larger events weigh more
- **WHEN** two eligible players have identical placements, one at large events and one at small events
- **THEN** the player whose finishes came at larger events ranks higher

#### Scenario: Unranked events do not mint champions
- **WHEN** a player's finishes include decks from an event whose standings are presentation order rather than a ranking
- **THEN** those finishes are scored as unranked results, exactly as the archetype Power Score treats them

#### Scenario: Score is not shown
- **WHEN** the Top Players ranking renders
- **THEN** each row shows its rank, player name, events and wins, and no numeric score

### Requirement: Top Grinders ranking
The Top Grinders ranking SHALL order eligible players by number of distinct events in the active subset, ties breaking by more wins, then by Top Players order, then name.

#### Scenario: More events rank higher
- **WHEN** one eligible player has 7 events and another has 4
- **THEN** the 7-event player ranks above the 4-event player regardless of finishes

#### Scenario: Wins break event ties
- **WHEN** two eligible players have the same number of events and one has more wins
- **THEN** the player with more wins ranks higher

### Requirement: Players view layout
The Players view SHALL replace the dashboard's main column below the format title row with a localized "← Metagame" control, a toggle between "Top Players" and "Top Grinders" (default Top Players), and the selected ranking's top 10 eligible players. Each row SHALL show rank, player name, distinct events and win count (the 🏆 treatment, omitted at zero), and activating it SHALL open that player's Player view.

#### Scenario: Default ranking
- **WHEN** the Players view opens
- **THEN** the Top Players ranking is selected and shows up to 10 rows

#### Scenario: Toggle switches ranking
- **WHEN** the user selects "Top Grinders"
- **THEN** the list shows the Top Grinders ranking in place, with no navigation and no history entry

#### Scenario: Fewer than 10 eligible players
- **WHEN** only 4 players are eligible in the active subset
- **THEN** the ranking shows those 4 rows and nothing else

#### Scenario: No eligible players
- **WHEN** no player is eligible in the active subset
- **THEN** the view shows a localized empty state explaining that no player has 2 or more events in the current view

#### Scenario: Ladder positions are not wins
- **WHEN** a player's only 1st-place placement comes from an event whose standings are presentation order rather than a ranking
- **THEN** that placement is not counted in the player's wins

#### Scenario: Win count shown only when non-zero
- **WHEN** a ranked player has no wins
- **THEN** the row shows no win trophy for that player

#### Scenario: Row opens the Player view
- **WHEN** the user activates a ranking row
- **THEN** that player's Player view opens

#### Scenario: Leaving to the metagame
- **WHEN** the user activates "← Metagame"
- **THEN** the dashboard returns, with the filters as they were and `?v=` and `?p=` removed from the URL

#### Scenario: Copy is localized
- **WHEN** the UI language is Spanish
- **THEN** the toggle reads "Top Jugadores" / "Top Grinders" and every other label is in Spanish, while player names stay as scraped

### Requirement: Most-played archetype in ranking rows
Each ranking row SHALL show, beneath the player name, the archetype the player registered most often in the active subset, with its color pips. A tie SHALL go to the archetype of the player's most recent deck among the tied. The archetype name SHALL stay in English in both locales.

#### Scenario: Most-played archetype is shown
- **WHEN** a ranked player has two Affinity decks and one Kuldotha deck in the active subset
- **THEN** their row shows "Affinity" with Affinity's color pips beneath the player name

#### Scenario: Tie goes to the most recent deck
- **WHEN** a ranked player has one Affinity deck and one more recent Kuldotha deck
- **THEN** their row shows "Kuldotha"

#### Scenario: Follows the active filters
- **WHEN** an archetype is isolated and the Players view is open
- **THEN** every row's most-played archetype is the isolated archetype, since only its decks are counted

### Requirement: Player view
The Player view SHALL show the player's display name, their distinct events and wins, and every one of their decks in the active subset, most recent event first. Each deck row SHALL show placement, archetype with its color pips, event name and date, and activating it SHALL open the existing decklist modal. A localized "← Back" control SHALL leave the view.

#### Scenario: Lists every deck of the player
- **WHEN** a player has 7 decks in the active subset
- **THEN** the Player view lists all 7, most recent event first, each with placement, archetype, pips, event name and date

#### Scenario: Deck opens the decklist modal
- **WHEN** the user activates a deck row in the Player view
- **THEN** the decklist modal opens for that deck, with export available as everywhere else

#### Scenario: Counts match the ranking
- **WHEN** the user opens a Player view from a ranking row showing 5 events
- **THEN** the Player view shows 5 events and lists the decks from those 5 events

#### Scenario: Player without decks in the view
- **WHEN** the Player view's player has no decks in the active subset (after a window or filter change, or from a link)
- **THEN** a localized empty state names the player and says they have no decks in the current view, and "← Back" remains available

### Requirement: Player views persisted in the URL
The Players view SHALL be persisted as `?v=players` and a Player view as `?v=players&p=<name>`, alongside `?f=`, `?w=` and `?a=`, so a link restores the view once data loads. Entering either view from navigation SHALL add a history entry so Back returns where the user came from; "← Back" and "← Metagame" SHALL step back when they were entered that way, and otherwise clear in place.

#### Scenario: Shared Players link
- **WHEN** the app is opened with `?f=MO&v=players`
- **THEN** once data loads the Players view for Modern is shown

#### Scenario: Shared Player link
- **WHEN** the app is opened with `?f=PAU&v=players&p=Luminati`
- **THEN** once data loads the Player view for Luminati in Pauper is shown, matching the name case-insensitively

#### Scenario: Names with special characters round-trip
- **WHEN** a Player view for a name containing spaces or URL-reserved characters is reloaded
- **THEN** the same player's view is shown

#### Scenario: Browser Back from a Player view
- **WHEN** the user went dashboard → Players view → Player view and presses the browser Back button
- **THEN** the Players view is shown, and pressing Back again returns to the dashboard

#### Scenario: Format switch keeps the Players view
- **WHEN** the user switches format while in the Players view or a Player view
- **THEN** the Players view for the new format is shown and `?p=` is removed

#### Scenario: Unknown view value is ignored
- **WHEN** the app is opened with a `?v=` value other than `players`
- **THEN** the dashboard is shown and `?v=` and `?p=` are removed

### Requirement: Filters inside the player views
In the Players and Player views, the time-frame, event-size, archetype and tier filters SHALL narrow the deck subset that rankings, counts and deck lists derive from, with no additional data fetch. The Event filter SHALL be disabled and ignored there; its selection SHALL be kept and apply again on returning to the dashboard. "Clear filters" SHALL reset filters without leaving the view.

#### Scenario: Archetype filter gives top pilots of that archetype
- **WHEN** an archetype is isolated and the Players view is open
- **THEN** both rankings rank only the decks of that archetype, so a player qualifies only with that archetype in 2 or more events

#### Scenario: Tier filter narrows to that tier's archetypes
- **WHEN** a tier is selected and the Players view is open
- **THEN** rankings and counts derive only from decks of archetypes in that tier

#### Scenario: Window change re-ranks
- **WHEN** the user switches from 2 weeks to 7 days in the Players view
- **THEN** both rankings are recomputed over the 7-day decks

#### Scenario: Event filter is disabled but kept
- **WHEN** an event was selected on the dashboard and the user opens the Players view
- **THEN** the Event filter control is disabled, the rankings ignore the event, and returning to the dashboard shows the event filter still applied

#### Scenario: Clear filters stays in the view
- **WHEN** the user activates "Clear filters" in the Players view
- **THEN** the filters reset and the Players view remains open with recomputed rankings

#### Scenario: Entering a Player view with an archetype isolated
- **WHEN** an archetype is isolated and the user opens a Player view
- **THEN** the view lists only that player's decks of the isolated archetype, and its header states the archetype in effect
