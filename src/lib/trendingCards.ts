// Pure derivation of the trending-cards tables ("En Tendencia" mainboard table +
// Top Sideboard Cards list). The `top_cards` RPC already aggregates per-card copy
// counts for a (format, date-window, board) slice server-side (and excludes basic
// lands there), so this module only ranks those rows by copy share and — for the
// mainboard table — attaches the period-over-period delta from the preceding
// window's rows. Kept here (not in the hook or JSX) so it stays unit-testable.

/** Percentage-point deadband: a change smaller than this reads as flat (–). */
export const DELTA_EPS = 0.5

/**
 * Minimum decks the **preceding** slice must hold before any delta is shown.
 * Below this the corpus can't support a comparison, so the change column is
 * suppressed field-wide rather than manufacturing a spike against a thin baseline.
 * Mirrors the metagame-share ShareDelta guard.
 */
export const MIN_PREV_DECKS = 3

/** How many cards each trending table shows. */
export const TRENDING_TOP_N = 10

/**
 * The complete set of basic land names (incl. snow-covered and Wastes). The RPC
 * already excludes basics via `type_line`, but this module re-excludes by name so
 * it is independently correct and any caller stays basic-free without a DB round-trip.
 */
const BASIC_LAND_NAMES = new Set<string>([
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Wastes',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
  'Snow-Covered Wastes',
])

/** One aggregated card row as returned by the `top_cards` RPC. */
export interface TopCardRow {
  cardName: string
  /** Total copies of this card across the slice's decks (this board). */
  totalCopies: number
  /** Distinct decks running the card in the slice. */
  deckCount: number
  /** Hotlinked Scryfall image (null on a resolution miss). */
  imageUrl: string | null
}

/** Signed copy-share delta vs the preceding window, as rendered by the change indicator. */
export interface CardDelta {
  direction: 'up' | 'down' | 'flat'
  /** Preceding-window copy share, percentage. */
  prevPct: number
  /** Current-minus-preceding copy share, in percentage points (signed). */
  valuePct: number
}

/** One ranked row of a trending table. */
export interface TrendingCard {
  cardName: string
  imageUrl: string | null
  /** Current copy share, percentage (copies / non-basic copies in the slice). */
  sharePct: number
  /** Period delta, or null when suppressed (no preceding window, thin data, or sideboard). */
  delta: CardDelta | null
}

/** Drop basic lands and total the remaining copies (the copy-share denominator). */
function nonBasic(rows: TopCardRow[]): { rows: TopCardRow[]; totalCopies: number } {
  const kept = rows.filter((r) => !BASIC_LAND_NAMES.has(r.cardName))
  const totalCopies = kept.reduce((sum, r) => sum + r.totalCopies, 0)
  return { rows: kept, totalCopies }
}

/** Copy share (percentage) for each card name in a slice, keyed by name. */
function shareByName(rows: TopCardRow[], totalCopies: number): Map<string, number> {
  const shares = new Map<string, number>()
  if (totalCopies <= 0) return shares
  for (const r of rows) shares.set(r.cardName, (r.totalCopies / totalCopies) * 100)
  return shares
}

/**
 * Rank a slice's cards by copy share and (for the mainboard table) attach the
 * period delta. `current`/`prev` are the RPC rows for the selected and the
 * immediately-preceding equal-length window; `prevDeckCount` is the number of
 * distinct decks in the preceding slice (from the deck fetch), used to gate the
 * delta. Pass `prev = null` (sideboard, or an event filter) to show share only.
 *
 * Copy share = a card's copies / the summed copies of all **non-basic** cards in
 * the slice (basics excluded from both the list and the denominator). A card
 * absent in the preceding window reads as a rise of its full current share.
 */
export function rankTrendingCards(
  current: TopCardRow[],
  prev: TopCardRow[] | null,
  prevDeckCount: number,
  topN: number = TRENDING_TOP_N,
): TrendingCard[] {
  const curr = nonBasic(current)

  const ranked = [...curr.rows].sort(
    (a, b) =>
      b.totalCopies - a.totalCopies ||
      b.deckCount - a.deckCount ||
      a.cardName.localeCompare(b.cardName),
  )

  let prevShares: Map<string, number> | null = null
  if (prev !== null && prevDeckCount >= MIN_PREV_DECKS) {
    const prevNonBasic = nonBasic(prev)
    prevShares = shareByName(prevNonBasic.rows, prevNonBasic.totalCopies)
  }

  return ranked.slice(0, topN).map((r) => {
    const sharePct = curr.totalCopies > 0 ? (r.totalCopies / curr.totalCopies) * 100 : 0
    let delta: CardDelta | null = null
    if (prevShares) {
      const prevPct = prevShares.get(r.cardName) ?? 0
      const valuePct = sharePct - prevPct
      const direction: CardDelta['direction'] =
        valuePct > DELTA_EPS ? 'up' : valuePct < -DELTA_EPS ? 'down' : 'flat'
      delta = { direction, prevPct, valuePct }
    }
    return { cardName: r.cardName, imageUrl: r.imageUrl, sharePct, delta }
  })
}
