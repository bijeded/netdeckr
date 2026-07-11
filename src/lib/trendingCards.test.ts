import { describe, it, expect } from 'vitest'
import {
  rankTrendingCards,
  partitionByCategory,
  TRENDING_TOP_N,
  type TopCardRow,
} from './trendingCards'

/** Build a TopCardRow with sensible defaults. */
function row(
  cardName: string,
  totalCopies: number,
  deckCount = 1,
  category: 'creature' | 'spell' = 'spell',
  imageUrl: string | null = null,
): TopCardRow {
  return { cardName, totalCopies, deckCount, category, imageUrl }
}

describe('rankTrendingCards — total copies, average, and ranking', () => {
  it('carries the raw total copy count per card', () => {
    const result = rankTrendingCards([row('A', 42, 12)])
    expect(result[0].totalCopies).toBe(42)
  })

  it('computes average copies per deck as copies / decks running it, rounded', () => {
    // 34 copies across 10 decks -> 3.4 -> 3x
    expect(rankTrendingCards([row('A', 34, 10)])[0].avgCopies).toBe(3)
    // 35 across 10 -> 3.5 -> 4x (round half up)
    expect(rankTrendingCards([row('B', 35, 10)])[0].avgCopies).toBe(4)
    // 40 across 10 -> 4x
    expect(rankTrendingCards([row('C', 40, 10)])[0].avgCopies).toBe(4)
  })

  it('yields 0 average (not NaN) when a card has zero decks', () => {
    expect(rankTrendingCards([row('A', 0, 0)])[0].avgCopies).toBe(0)
  })

  it('does not expose a copy-share percentage', () => {
    const result = rankTrendingCards([row('A', 10, 2)])
    expect(result[0]).not.toHaveProperty('sharePct')
  })

  it('weights copies, not deck presence (a 4-of outranks a widely-run 1-of)', () => {
    const rows = [row('Filler', 3, 3), row('Bomb', 12, 3)]
    const result = rankTrendingCards(rows)
    expect(result[0].cardName).toBe('Bomb')
    expect(result[1].cardName).toBe('Filler')
  })

  it('ranks by copies desc, breaking ties by deck count then name', () => {
    const rows = [row('Zed', 10, 2), row('Ace', 10, 5), row('Bex', 10, 5)]
    const result = rankTrendingCards(rows)
    expect(result.map((c) => c.cardName)).toEqual(['Ace', 'Bex', 'Zed'])
  })

  it('caps the list at the top N', () => {
    const rows = Array.from({ length: TRENDING_TOP_N + 5 }, (_, i) => row(`C${i}`, 100 - i))
    const result = rankTrendingCards(rows)
    expect(result).toHaveLength(TRENDING_TOP_N)
    expect(result[0].cardName).toBe('C0')
  })

  it('returns an empty list for an empty slice', () => {
    expect(rankTrendingCards([])).toEqual([])
  })

  it('carries the card image url through', () => {
    const result = rankTrendingCards([row('A', 5, 1, 'spell', 'http://img/a.png')])
    expect(result[0].imageUrl).toBe('http://img/a.png')
  })
})

describe('partitionByCategory — split mainboard rows by card type', () => {
  it('separates creatures from spells', () => {
    const rows = [
      row('Goblin', 8, 4, 'creature'),
      row('Bolt', 12, 4, 'spell'),
      row('Bear', 4, 2, 'creature'),
    ]
    const { creatures, spells } = partitionByCategory(rows)
    expect(creatures.map((r) => r.cardName).sort()).toEqual(['Bear', 'Goblin'])
    expect(spells.map((r) => r.cardName)).toEqual(['Bolt'])
  })

  it('returns empty groups for an empty input', () => {
    expect(partitionByCategory([])).toEqual({ creatures: [], spells: [] })
  })
})
