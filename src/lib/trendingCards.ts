// Pure derivation of the trending-cards tables (Trending Creatures, Trending
// Spells, Top Sideboard Cards, Top New Cards). The `top_cards` RPC already
// aggregates per-card copy counts for a (format, date-window, board) slice
// server-side, excludes lands, and tags each card with a creature/spell category,
// so this module only partitions the mainboard rows by category and ranks each
// slice by total copies (carrying an average-copies-per-deck value). Top New Cards
// comes from `recent_set_top_cards` (both boards, set-tagged) and is ranked the
// same way. Kept here (not in the hook or JSX) so it stays unit-testable.

import type { FormatCode } from './formats'

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
export interface RecentSetCardRow extends RankableCardRow {
  /** The recent main set the card is printed in (the newer one if both). */
  setCode: string
}

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
  /** Recent main set code (Top New Cards rows only). */
  setCode?: string
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
 * deck. `rows` are the RPC rows for the slice (lands already excluded, category
 * already tagged). Ranking is by copies desc, then deck count desc, then name (a
 * deterministic total order). Average copies per deck = total copies / decks
 * running it, rounded (0 when no decks run it).
 */
export function rankTrendingCards(
  rows: (RankableCardRow & { setCode?: string })[],
  topN: number = TRENDING_TOP_N,
): TrendingCard[] {
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
      ...(r.setCode !== undefined && { setCode: r.setCode }),
    }))
}
