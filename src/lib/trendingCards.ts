// Pure derivation of the trending-cards tables ("En Tendencia" mainboard table +
// Top Sideboard Cards list). The `top_cards` RPC already aggregates per-card copy
// counts for a (format, date-window, board) slice server-side and excludes lands
// there, so this module only ranks those rows by copy share and carries each
// card's total copy count. Kept here (not in the hook or JSX) so it stays
// unit-testable.

/** How many cards each trending table shows. */
export const TRENDING_TOP_N = 10

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

/** One ranked row of a trending table. */
export interface TrendingCard {
  cardName: string
  imageUrl: string | null
  /** Copy share, percentage (this card's copies / all eligible copies in the slice). */
  sharePct: number
  /** Total copies of this card in the slice. */
  totalCopies: number
}

/**
 * Rank a slice's cards by copy share and carry each card's total copy count.
 * `rows` are the RPC rows for the slice (lands already excluded server-side).
 * Copy share = a card's copies / the summed copies of all rows. Ranking is by
 * copies desc, then deck count desc, then name (a deterministic total order).
 */
export function rankTrendingCards(rows: TopCardRow[], topN: number = TRENDING_TOP_N): TrendingCard[] {
  const totalCopies = rows.reduce((sum, r) => sum + r.totalCopies, 0)

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
      sharePct: totalCopies > 0 ? (r.totalCopies / totalCopies) * 100 : 0,
      totalCopies: r.totalCopies,
    }))
}
