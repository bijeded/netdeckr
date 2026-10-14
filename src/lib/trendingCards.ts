// Pure derivation of the trending-cards tables (Trending Creatures, Trending
// Spells, Top Sideboard Cards, Top New Cards). The `top_cards` RPC already
// aggregates per-card copy counts for a (format, date-window, board) slice
// server-side, excludes lands, and tags each card with a creature/spell category,
// so this module only partitions the mainboard rows by category and ranks each
// slice by total copies, carrying an average-copies-per-deck value, a play rate
// (share of the slice's legal decks running the card) and a play-rate trend vs the
// preceding equal-length window. Top New Cards comes from `recent_set_top_cards`
// (both boards) and is ranked the same way. Kept here (not in the hook or JSX) so
// it stays unit-testable.

import type { FormatCode } from './formats'
import { deltaOf, MIN_PREV_DECKS, type ShareDelta } from './shareDelta'

/** How many cards each trending table shows. */
export const TRENDING_TOP_N = 10

/** Card type category, as tagged by the `top_cards` RPC from Scryfall type_line. */
export type CardCategory = 'creature' | 'spell'

/** The fields ranking needs, shared by both aggregations' rows. */
export interface RankableCardRow {
  cardName: string
  /** Total copies of this card across the slice's decks. */
  totalCopies: number
  /** Distinct decks running the card in the slice. */
  deckCount: number
  /** Hotlinked Scryfall image (null on a resolution miss). */
  imageUrl: string | null
}

/** One aggregated card row as returned by the `top_cards` RPC (one board). */
export interface TopCardRow extends RankableCardRow {
  /** 'creature' when the card's type_line contains "Creature", else 'spell'. */
  category: CardCategory
}

/** One row of the `recent_set_top_cards` RPC (both boards combined). */
export type RecentSetCardRow = RankableCardRow

/**
 * Whether a format shows the Top New Cards table. Pre-Modern's card pool is
 * frozen, so "the newest sets" has nothing to say there.
 */
export function hasNewCardsTable(format: FormatCode): boolean {
  return format !== 'PREM'
}

/** One ranked row of a trending table. */
export interface TrendingCard {
  cardName: string
  imageUrl: string | null
  /** Total copies of this card in the slice. */
  totalCopies: number
  /** Average copies per deck running it (totalCopies / deckCount), rounded. */
  avgCopies: number
  /** Distinct legal decks in the slice running it. */
  deckCount: number
  /**
   * Share of the slice's legal decks running it, 0–100, unrounded. Null when the
   * slice total is unknown or zero (rendered `–`, never `Infinity%`).
   */
  playRatePct: number | null
  /**
   * Play-rate change vs the preceding equal-length window, in percentage points.
   * Null when the preceding slice is too thin (< MIN_PREV_DECKS) or unavailable.
   */
  trend: ShareDelta | null
}

/** The play-rate inputs for one table: slice totals and the preceding window's rows. */
export interface PlayRateContext {
  /** Legal decks in the selected slice (the play-rate denominator). */
  selectedTotal: number
  /** Legal decks in the preceding slice. */
  precedingTotal: number
  /**
   * The same table's rows over the preceding window; null when they could not be
   * fetched (or were skipped, under an event filter), which blanks the trend.
   */
  precedingRows: RankableCardRow[] | null
}

const NO_PLAY_RATE: PlayRateContext = { selectedTotal: 0, precedingTotal: 0, precedingRows: null }

/**
 * Render a play rate as a whole percentage: `38%`, `<1%` for a rate above zero
 * that rounds to zero, and `–` when it is unknown.
 */
export function formatPlayRate(pct: number | null): string {
  if (pct === null) return '–'
  const rounded = Math.round(pct)
  if (rounded === 0 && pct > 0) return '<1%'
  return `${rounded}%`
}

/**
 * Total legal decks in a trending slice: the per-archetype counts summed over
 * every archetype (`archetypeNames` null = no archetype/tier filter) or over the
 * named ones only. The play-rate denominator; counts come from the metagame
 * corpus (`SliceDeckCounts`), which already applies legality, window, event and
 * size, so only the archetype narrowing happens here.
 */
export function sliceDeckTotal(
  countsByArchetype: Record<string, number>,
  archetypeNames: string[] | null,
): number {
  const names = archetypeNames ?? Object.keys(countsByArchetype)
  let total = 0
  for (const name of new Set(names)) total += countsByArchetype[name] ?? 0
  return total
}

/** Split mainboard rows into creatures and non-creature spells. */
export function partitionByCategory(rows: TopCardRow[]): {
  creatures: TopCardRow[]
  spells: TopCardRow[]
} {
  const creatures: TopCardRow[] = []
  const spells: TopCardRow[] = []
  for (const r of rows) {
    ;(r.category === 'creature' ? creatures : spells).push(r)
  }
  return { creatures, spells }
}

/**
 * Rank a slice's cards by total copies and carry each card's average copies per
 * deck, play rate and trend. `rows` are the RPC rows for the slice (lands already
 * excluded, category already tagged). Ranking is by copies desc, then deck count
 * desc, then name (a deterministic total order) — play rate never reorders it.
 * Average copies per deck = total copies / decks running it, rounded (0 when no
 * decks run it). Play rate = decks running it / `selectedTotal`. The trend is the
 * play rate minus the preceding window's (a card absent there counts as 0%),
 * classified by the shared share-delta deadband, and suppressed for every card
 * when the preceding slice holds fewer than MIN_PREV_DECKS decks.
 */
export function rankTrendingCards(
  rows: RankableCardRow[],
  context: PlayRateContext = NO_PLAY_RATE,
  topN: number = TRENDING_TOP_N,
): TrendingCard[] {
  const { selectedTotal, precedingTotal, precedingRows } = context
  const hasRate = selectedTotal > 0
  const hasTrend = hasRate && precedingRows !== null && precedingTotal >= MIN_PREV_DECKS
  const precedingDecks = new Map<string, number>()
  for (const r of precedingRows ?? []) precedingDecks.set(r.cardName, r.deckCount)

  return [...rows]
    .sort(
      (a, b) =>
        b.totalCopies - a.totalCopies ||
        b.deckCount - a.deckCount ||
        a.cardName.localeCompare(b.cardName),
    )
    .slice(0, topN)
    .map((r) => ({
      cardName: r.cardName,
      imageUrl: r.imageUrl,
      totalCopies: r.totalCopies,
      avgCopies: r.deckCount > 0 ? Math.round(r.totalCopies / r.deckCount) : 0,
      deckCount: r.deckCount,
      playRatePct: hasRate ? (r.deckCount / selectedTotal) * 100 : null,
      trend: hasTrend
        ? deltaOf(
            (r.deckCount / selectedTotal) * 100,
            ((precedingDecks.get(r.cardName) ?? 0) / precedingTotal) * 100,
          )
        : null,
    }))
}
