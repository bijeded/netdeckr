import { describe, it, expect } from 'vitest'
import {
  rankTrendingCards,
  TRENDING_TOP_N,
  DELTA_EPS,
  MIN_PREV_DECKS,
  type TopCardRow,
} from './trendingCards'

/** Build a TopCardRow with sensible defaults. */
function row(cardName: string, totalCopies: number, deckCount = 1, imageUrl: string | null = null): TopCardRow {
  return { cardName, totalCopies, deckCount, imageUrl }
}

describe('rankTrendingCards — copy share and ranking', () => {
  it('computes copy share as a card copies over the summed copies of the slice', () => {
    const current = [row('A', 60), row('B', 30), row('C', 10)] // total 100
    const result = rankTrendingCards(current, null, 0)
    expect(result[0]).toMatchObject({ cardName: 'A', sharePct: 60 })
    expect(result[1]).toMatchObject({ cardName: 'B', sharePct: 30 })
    expect(result[2]).toMatchObject({ cardName: 'C', sharePct: 10 })
  })

  it('weights copies, not deck presence (a 4-of outranks a widely-run 1-of)', () => {
    // Bomb: 4 copies across 1 deck; Filler: 1 copy across 3 decks.
    const current = [row('Filler', 3, 3), row('Bomb', 12, 3)]
    const result = rankTrendingCards(current, null, 0)
    expect(result[0].cardName).toBe('Bomb')
    expect(result[1].cardName).toBe('Filler')
  })

  it('ranks by copies desc, breaking ties by deck count then name', () => {
    const current = [row('Zed', 10, 2), row('Ace', 10, 5), row('Bex', 10, 5)]
    const result = rankTrendingCards(current, null, 0)
    expect(result.map((c) => c.cardName)).toEqual(['Ace', 'Bex', 'Zed'])
  })

  it('caps the list at the top N', () => {
    const current = Array.from({ length: TRENDING_TOP_N + 5 }, (_, i) => row(`C${i}`, 100 - i))
    const result = rankTrendingCards(current, null, 0)
    expect(result).toHaveLength(TRENDING_TOP_N)
    expect(result[0].cardName).toBe('C0')
  })

  it('returns an empty list for an empty slice', () => {
    expect(rankTrendingCards([], null, 0)).toEqual([])
  })

  it('carries the card image url through', () => {
    const result = rankTrendingCards([row('A', 5, 1, 'http://img/a.png')], null, 0)
    expect(result[0].imageUrl).toBe('http://img/a.png')
  })
})

describe('rankTrendingCards — basic-land exclusion (defensive)', () => {
  it('drops basic lands and excludes them from the share denominator', () => {
    const current = [row('Mountain', 40), row('Lightning Bolt', 30), row('Island', 30)]
    const result = rankTrendingCards(current, null, 0)
    expect(result.map((c) => c.cardName)).toEqual(['Lightning Bolt'])
    // denominator is only the non-basic 30 copies → 100%
    expect(result[0].sharePct).toBe(100)
  })

  it('drops snow-covered basics but keeps nonbasic lands', () => {
    const current = [row('Snow-Covered Forest', 20), row('Steam Vents', 10)]
    const result = rankTrendingCards(current, null, 0)
    expect(result.map((c) => c.cardName)).toEqual(['Steam Vents'])
  })
})

describe('rankTrendingCards — period delta', () => {
  const current = [row('A', 50), row('B', 50)] // 50% / 50%

  it('reports a signed pp delta vs the preceding window', () => {
    const prev = [row('A', 40), row('B', 60)] // A 40%, B 60%
    const result = rankTrendingCards(current, prev, MIN_PREV_DECKS)
    const a = result.find((c) => c.cardName === 'A')!
    expect(a.delta).toMatchObject({ direction: 'up', valuePct: 10, prevPct: 40 })
    const b = result.find((c) => c.cardName === 'B')!
    expect(b.delta).toMatchObject({ direction: 'down', valuePct: -10, prevPct: 60 })
  })

  it('reads a card absent in the preceding window as a full-share rise', () => {
    const prev = [row('A', 100)] // only A present before; B is new
    const result = rankTrendingCards(current, prev, MIN_PREV_DECKS)
    const b = result.find((c) => c.cardName === 'B')!
    expect(b.delta).toMatchObject({ direction: 'up', valuePct: 50, prevPct: 0 })
  })

  it('flattens a change within the deadband', () => {
    const prev = [row('A', 50), row('B', 50)] // identical shares → 0 pp
    const result = rankTrendingCards(current, prev, MIN_PREV_DECKS)
    expect(result.every((c) => c.delta?.direction === 'flat')).toBe(true)
    expect(DELTA_EPS).toBeGreaterThan(0)
  })

  it('suppresses the delta field-wide when the preceding slice is too thin', () => {
    const prev = [row('A', 40), row('B', 60)]
    const result = rankTrendingCards(current, prev, MIN_PREV_DECKS - 1)
    expect(result.every((c) => c.delta === null)).toBe(true)
  })

  it('shows no delta when there is no preceding window (event-filtered / sideboard)', () => {
    const result = rankTrendingCards(current, null, 999)
    expect(result.every((c) => c.delta === null)).toBe(true)
  })
})
