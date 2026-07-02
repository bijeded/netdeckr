// Pure selection of which decklists to show for an archetype. The scraper stores
// every deck (all finishes); the UI prefers top finishes and falls back to the
// latest lists — this logic lives here (not in JSX) so it is unit-testable.

export interface DeckRow {
  sourceDeckId: string
  player: string
  /** Raw MTGTop8 finish label: "1", "2", "3-4", "5-8", … */
  placement: string
  eventName: string
  /** ISO date (YYYY-MM-DD). */
  eventDate: string
  archetypeName: string
  /** WUBRG color-identity string. */
  colorIdentity: string
}

// How many decklists an expanded archetype shows, in both the top-finish and the
// latest-lists branches.
const DISPLAY_COUNT = 4

/** First integer in a placement label, or null if there is none. */
function placementNumber(placement: string): number | null {
  const match = placement.match(/\d+/)
  return match ? Number(match[0]) : null
}

/** True when the placement is a Top 4 finish (1st, 2nd, or 3-4). */
export function isTopFour(placement: string): boolean {
  const n = placementNumber(placement)
  return n !== null && n >= 1 && n <= 4
}

/**
 * Choose the decks to display for one archetype: its 4 most recent Top 4 finishes
 * (1st, 2nd, Top 4), or — when it has none — its 4 most recent decks overall.
 * Both branches are ordered most-recent-first and capped at `DISPLAY_COUNT`.
 */
export function selectDisplayDecks(rows: DeckRow[]): DeckRow[] {
  const topFour = rows.filter((r) => isTopFour(r.placement))
  const pool = topFour.length > 0 ? topFour : rows
  return [...pool]
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    .slice(0, DISPLAY_COUNT)
}
