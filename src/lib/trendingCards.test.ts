import { describe, it, expect } from 'vitest'
import { rankTrendingCards, TRENDING_TOP_N, type TopCardRow } from './trendingCards'

/** Build a TopCardRow with sensible defaults. */
function row(cardName: string, totalCopies: number, deckCount = 1, imageUrl: string | null = null): TopCardRow {
  return { cardName, totalCopies, deckCount, imageUrl }
}

describe('rankTrendingCards — copy share, count, and ranking', () => {
  it('computes copy share as a card copies over the summed copies of the slice', () => {
    const rows = [row('A', 60), row('B', 30), row('C', 10)] // total 100
    const result = rankTrendingCards(rows)
    expect(result[0]).toMatchObject({ cardName: 'A', sharePct: 60, totalCopies: 60 })
    expect(result[1]).toMatchObject({ cardName: 'B', sharePct: 30, totalCopies: 30 })
    expect(result[2]).toMatchObject({ cardName: 'C', sharePct: 10, totalCopies: 10 })
  })

  it('carries the raw total copy count per card', () => {
    const result = rankTrendingCards([row('A', 42, 12)])
    expect(result[0].totalCopies).toBe(42)
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

  it('yields 0% (not NaN) when the slice has zero copies', () => {
    const result = rankTrendingCards([row('A', 0)])
    expect(result[0].sharePct).toBe(0)
  })

  it('carries the card image url through', () => {
    const result = rankTrendingCards([row('A', 5, 1, 'http://img/a.png')])
    expect(result[0].imageUrl).toBe('http://img/a.png')
  })
})
