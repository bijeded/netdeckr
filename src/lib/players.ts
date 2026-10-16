// Pure player grouping and rankings for the Players view. Derived client-side
// from the already-loaded deck corpus (no data access, no JSX) — see
// openspec/changes/add-player-rankings/design.md.

import type { DeckRow } from './deckSelection'
import { placementBadge, placementSortKey } from './placement'
import { archetypePowerScore } from './powerScore'

/**
 * One deck of the player corpus: a display deck plus the event facts the
 * rankings need. `unranked` marks a deck whose event standings are presentation
 * order rather than a ranking (see `isUnrankedEvent`).
 */
export interface PlayerDeck extends DeckRow {
  eventId: number | null
  /** The event's tournament size; null when MTGTop8 didn't report it. */
  playerCount: number | null
  unranked: boolean
}

/** A player's decks in the active subset, with what the rankings sort on. */
export interface PlayerGroup {
  key: string
  /** Most common spelling across the decks; ties go to the most recent deck's. */
  displayName: string
  /** Archetype on most of the decks; ties go to the most recent deck's. */
  topArchetype: { name: string; colorIdentity: string }
  /** Most recent event first, best finish first within an event. */
  decks: PlayerDeck[]
  /** Distinct events (two decks in one event count once). */
  events: number
  /** 1st-place finishes at ranked events — a ladder position is not a win. */
  wins: number
  /** Power Score over the player's finishes; ranks Top Players, never shown. */
  score: number
}

/** A player needs this many distinct events to be ranked at all. */
export const MIN_RANKED_EVENTS = 2
/** Rows each ranking shows. */
export const RANKING_SIZE = 10

/**
 * Identity of a pilot name: case-insensitive and ignoring surrounding
 * whitespace. Punctuation and inner spaces are kept — merging "Bruno Guerra"
 * with "BrunoGuerra" risks conflating two people, a worse error than a split.
 * Null for an empty name, which belongs to no player.
 */
export function playerKey(name: string): string | null {
  const key = name.trim().toLowerCase()
  return key === '' ? null : key
}

/**
 * A player's Power Score: the archetype Power Score math applied to one
 * player's finishes — same finish quality, size weighting, unranked handling and
 * small-sample adjustment. Reused, not reimplemented, so the two cannot drift.
 */
export function playerPowerScore(decks: PlayerDeck[]): number {
  return archetypePowerScore(
    decks.map((d) => d.placement),
    decks.map((d) => d.playerCount),
    decks.map((d) => d.unranked),
  )
}

function byRecencyThenFinish(a: PlayerDeck, b: PlayerDeck): number {
  return (
    b.eventDate.localeCompare(a.eventDate) ||
    placementSortKey(a.placement) - placementSortKey(b.placement)
  )
}

/**
 * The deck whose `keyOf` value is most frequent. Decks are most-recent-first,
 * so the first to reach the top count is the most recent one among the tied.
 */
function mostCommon(sortedDecks: PlayerDeck[], keyOf: (deck: PlayerDeck) => string): PlayerDeck {
  const counts = new Map<string, number>()
  for (const deck of sortedDecks) {
    const key = keyOf(deck)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best = sortedDecks[0]
  let bestCount = 0
  for (const deck of sortedDecks) {
    const count = counts.get(keyOf(deck))!
    if (count > bestCount) {
      best = deck
      bestCount = count
    }
  }
  return best
}

/** Group decks by player identity. Decks with an empty pilot name are dropped. */
export function groupPlayers(decks: PlayerDeck[]): PlayerGroup[] {
  const byKey = new Map<string, PlayerDeck[]>()
  for (const deck of decks) {
    const key = playerKey(deck.player)
    if (key === null) continue
    const list = byKey.get(key)
    if (list) list.push(deck)
    else byKey.set(key, [deck])
  }
  const groups: PlayerGroup[] = []
  for (const [key, list] of byKey) {
    const sorted = [...list].sort(byRecencyThenFinish)
    const eventIds = new Set<number>()
    let eventless = 0
    for (const deck of sorted) {
      if (deck.eventId === null) eventless += 1
      else eventIds.add(deck.eventId)
    }
    const topDeck = mostCommon(sorted, (d) => d.archetypeName)
    groups.push({
      key,
      displayName: mostCommon(sorted, (d) => d.player.trim()).player.trim(),
      topArchetype: { name: topDeck.archetypeName, colorIdentity: topDeck.colorIdentity },
      decks: sorted,
      events: eventIds.size + eventless,
      wins: sorted.filter((d) => !d.unranked && placementBadge(d.placement).kind === 'first').length,
      score: playerPowerScore(sorted),
    })
  }
  return groups
}

function byKey(a: PlayerGroup, b: PlayerGroup): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

function byTopPlayers(a: PlayerGroup, b: PlayerGroup): number {
  return b.score - a.score || b.events - a.events || b.wins - a.wins || byKey(a, b)
}

function eligible(groups: PlayerGroup[]): PlayerGroup[] {
  return groups.filter((g) => g.events >= MIN_RANKED_EVENTS)
}

/** Eligible players by Power Score; ties by events, then wins, then name. */
export function rankTopPlayers(groups: PlayerGroup[], limit = RANKING_SIZE): PlayerGroup[] {
  return eligible(groups).sort(byTopPlayers).slice(0, limit)
}

/** Eligible players by distinct events; ties by wins, then Top Players order. */
export function rankTopGrinders(groups: PlayerGroup[], limit = RANKING_SIZE): PlayerGroup[] {
  return eligible(groups)
    .sort((a, b) => b.events - a.events || b.wins - a.wins || byTopPlayers(a, b))
    .slice(0, limit)
}
