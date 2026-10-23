// Pure construction of an archetype's averaged "stock" decklist from the
// per-card aggregate the `archetype_card_stats` RPC returns. No JSX, no data access — see
// openspec/changes/archetype-analysis/design.md (Decisions 2 and 3).
//
// The RPC only groups; every weighting rule lives here and in powerScore.ts, so
// the stock list weights a finish exactly as the Power Score does.

import { cardCategory } from './cardType'
import { finishQuality, sizeWeight, UNRANKED_QUALITY } from './powerScore'

/** One (board, card) row from the RPC: which decks played it, and how many copies each. */
export interface CardStatRow {
  board: 'main' | 'side'
  /** Canonical Scryfall name (scraped name on a resolution miss) — the card's identity. */
  name: string
  /** Name as scraped from MTGTop8 — the MTGO export uses it to tell split cards apart. */
  scrapedName: string
  /** Aligned with `quantities`: `deckIds[i]` ran `quantities[i]` copies. */
  deckIds: number[]
  quantities: number[]
  typeLine: string | null
  cmc: number | null
  rarity: string | null
  setCode: string | null
  collectorNumber: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
}

/** The per-deck facts a deck's weight needs. */
export interface WeightedDeckInput {
  id: number
  placement: string
  playerCount: number | null
  /** The deck came from an event whose standings are presentation order (see `isUnrankedEvent`). */
  unranked: boolean
}

/** A stock-list line. Shaped like a decklist line so it renders and exports as one. */
export interface StockCard {
  quantity: number
  name: string
  scrapedName: string
  setCode: string | null
  collectorNumber: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  typeLine: string | null
  cmc: number | null
  rarity: string | null
}

export interface StockListResult {
  main: StockCard[]
  side: StockCard[]
  /** Decks the list was built from (those present in both the RPC rows and the corpus). */
  deckCount: number
}

// A deck with no parseable standing still counts toward inclusion, at the
// lowest finish bucket (finishQuality's "beyond"), rather than vanishing at 0.
const UNPARSEABLE_QUALITY = 0.1

/**
 * A deck's weight: how deep it finished times how large its tournament was —
 * the same two factors, with the same functions, as the Power Score.
 */
export function deckWeight(deck: WeightedDeckInput): number {
  const quality = deck.unranked ? UNRANKED_QUALITY : (finishQuality(deck.placement) ?? UNPARSEABLE_QUALITY)
  return quality * sizeWeight(deck.playerCount)
}

/** Median, rounding an even-length median half up. 0 for no values. */
export function medianRounded(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(median)
}

/** Most common value; a tie resolves to the higher value. */
export function modeHigh(values: number[]): number {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = 0
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value > best)) {
      best = value
      bestCount = count
    }
  }
  return best
}

interface RankedCard {
  row: CardStatRow
  weighted: number
  avgCopies: number
  copies: number
}

function toStockCard(row: CardStatRow, quantity: number): StockCard {
  return {
    quantity,
    name: row.name,
    scrapedName: row.scrapedName,
    setCode: row.setCode,
    collectorNumber: row.collectorNumber,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl ?? row.imageUrl,
    typeLine: row.typeLine,
    cmc: row.cmc,
    rarity: row.rarity,
  }
}

const isLand = (row: CardStatRow) => cardCategory(row.typeLine) === 'lands'

/**
 * Fill `slots` from `ranked` in order, each card at its most common copy count,
 * trimming the last card to the space left. Returns the placed lines.
 */
function fill(ranked: RankedCard[], slots: number): StockCard[] {
  const placed: StockCard[] = []
  let left = slots
  for (const card of ranked) {
    if (left <= 0) break
    const quantity = Math.min(card.copies, left)
    if (quantity <= 0) continue
    placed.push(toStockCard(card.row, quantity))
    left -= quantity
  }
  return placed
}

/**
 * Build the stock list for one archetype.
 *
 * `decks` is the archetype's analysed corpus (legal, last 2 weeks). RPC entries
 * for decks outside it are ignored, so the two sources cannot disagree at a
 * window boundary.
 */
export function buildStockList(rows: CardStatRow[], decks: WeightedDeckInput[]): StockListResult {
  const weights = new Map<number, number>()
  for (const deck of decks) weights.set(deck.id, deckWeight(deck))

  const mainTotals = new Map<number, number>()
  const landTotals = new Map<number, number>()
  const sideTotals = new Map<number, number>()
  const contributing = new Set<number>()

  const rankedMain: RankedCard[] = []
  const rankedSide: RankedCard[] = []

  for (const row of rows) {
    const quantities: number[] = []
    let weightSum = 0
    for (let i = 0; i < row.deckIds.length; i++) {
      const id = row.deckIds[i]
      const weight = weights.get(id)
      if (weight === undefined) continue
      const qty = row.quantities[i]
      quantities.push(qty)
      weightSum += weight
      contributing.add(id)
      const totals = row.board === 'side' ? sideTotals : mainTotals
      totals.set(id, (totals.get(id) ?? 0) + qty)
      if (row.board === 'main' && isLand(row)) landTotals.set(id, (landTotals.get(id) ?? 0) + qty)
    }
    if (quantities.length === 0) continue
    const ranked: RankedCard = {
      row,
      weighted: weightSum,
      avgCopies: quantities.reduce((s, q) => s + q, 0) / quantities.length,
      copies: modeHigh(quantities),
    }
    ;(row.board === 'side' ? rankedSide : rankedMain).push(ranked)
  }

  const deckIds = [...contributing]
  const deckCount = deckIds.length
  if (deckCount === 0) {
    return { main: [], side: [], deckCount: 0 }
  }

  // Weighted inclusion = Σ weights of decks playing / Σ weights of all decks.
  // The denominator is shared, so ranking by the numerator is equivalent.
  const byRank = (a: RankedCard, b: RankedCard) =>
    b.weighted - a.weighted || b.avgCopies - a.avgCopies || a.row.name.localeCompare(b.row.name)
  rankedMain.sort(byRank)
  rankedSide.sort(byRank)

  // A deck with no sideboard (or no lands) has no rows on that side, so count it as 0.
  const totalOf = (totals: Map<number, number>) => deckIds.map((id) => totals.get(id) ?? 0)
  const mainSize = medianRounded(totalOf(mainTotals))
  const landSlots = Math.min(medianRounded(totalOf(landTotals)), mainSize)
  const sideSize = medianRounded(totalOf(sideTotals))

  const lands = fill(
    rankedMain.filter((c) => isLand(c.row)),
    landSlots,
  )
  const spells = fill(
    rankedMain.filter((c) => !isLand(c.row)),
    mainSize - landSlots,
  )
  // Keep ranking order across both groups; the decklist view groups by type itself.
  const placedByName = new Map([...lands, ...spells].map((c) => [c.name, c]))
  const main = rankedMain
    .map((c) => placedByName.get(c.row.name))
    .filter((c): c is StockCard => c !== undefined)
  const side = fill(rankedSide, sideSize)

  return { main, side, deckCount }
}
