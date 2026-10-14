import { describe, it, expect } from 'vitest'
import {
  hasNewCardsTable,
  rankTrendingCards,
  partitionByCategory,
  sliceDeckTotal,
  formatPlayRate,
  type RankableCardRow,
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

describe('Top New Cards ranking', () => {
  it('carries no set code through ranking', () => {
    const ranked = rankTrendingCards([
      { cardName: 'Ring', totalCopies: 4, deckCount: 2, imageUrl: null },
      { cardName: 'Bolt', totalCopies: 9, deckCount: 3, imageUrl: null },
    ])
    expect(ranked.map((c) => c.cardName)).toEqual(['Bolt', 'Ring'])
    expect(ranked[0]).not.toHaveProperty('setCode')
  })

  it('is shown in every format except Pre-Modern', () => {
    expect((['ST', 'PI', 'MO', 'PAU'] as const).every(hasNewCardsTable)).toBe(true)
    expect(hasNewCardsTable('PREM')).toBe(false)
  })
})

describe('sliceDeckTotal', () => {
  const counts = { 'Izzet Lesson': 12, 'Mono Red': 7, Domain: 3 }

  it('sums every archetype when no archetype or tier filter is active', () => {
    expect(sliceDeckTotal(counts, null)).toBe(22)
  })

  it('sums only the named archetypes under an archetype or tier filter', () => {
    expect(sliceDeckTotal(counts, ['Izzet Lesson', 'Domain'])).toBe(15)
  })

  it('counts an archetype absent from the slice as zero', () => {
    expect(sliceDeckTotal(counts, ['Rakdos Midrange'])).toBe(0)
    expect(sliceDeckTotal({}, null)).toBe(0)
  })

  it('counts a repeated name once', () => {
    expect(sliceDeckTotal(counts, ['Mono Red', 'Mono Red'])).toBe(7)
  })
})

/** A preceding-window row: only the card name and deck count matter for the trend. */
function prev(cardName: string, deckCount: number): RankableCardRow {
  return { cardName, totalCopies: deckCount * 4, deckCount, imageUrl: null }
}

describe('rankTrendingCards — play rate', () => {
  it('is the share of the slice\'s legal decks running the card', () => {
    // 19 of 50 decks -> 38%
    const [card] = rankTrendingCards([row('A', 70, 19)], { selectedTotal: 50, precedingTotal: 0, precedingRows: null })
    expect(card.deckCount).toBe(19)
    expect(card.playRatePct).toBeCloseTo(38, 5)
    expect(formatPlayRate(card.playRatePct)).toBe('38%')
  })

  it('uses every deck in the slice as the sideboard denominator', () => {
    // 6 of 40 decks bring it (10 of the 40 have no sideboard) -> 15%, not 20%
    const [card] = rankTrendingCards([row('Duress', 12, 6)], { selectedTotal: 40, precedingTotal: 0, precedingRows: null })
    expect(formatPlayRate(card.playRatePct)).toBe('15%')
  })

  it('counts a new card run in either board once per deck', () => {
    // 5 mainboard + 3 sideboard decks, distinct -> deck_count 8 of 40 -> 20%
    const [card] = rankTrendingCards([row('New', 20, 8)], { selectedTotal: 40, precedingTotal: 0, precedingRows: null })
    expect(formatPlayRate(card.playRatePct)).toBe('20%')
  })

  it('is null (rendered –) when the slice total is unknown or zero', () => {
    const [card] = rankTrendingCards([row('A', 4, 1)])
    expect(card.playRatePct).toBeNull()
    expect(formatPlayRate(card.playRatePct)).toBe('–')
  })

  it('never reorders the copies ranking', () => {
    // A: more copies, fewer decks (lower play rate) still ranks first.
    const ranked = rankTrendingCards([row('B', 30, 20), row('A', 40, 10)], {
      selectedTotal: 50,
      precedingTotal: 0,
      precedingRows: null,
    })
    expect(ranked.map((c) => c.cardName)).toEqual(['A', 'B'])
    expect(ranked[0].playRatePct!).toBeLessThan(ranked[1].playRatePct!)
  })
})

describe('formatPlayRate', () => {
  it('rounds to a whole percentage', () => {
    expect(formatPlayRate(37.6)).toBe('38%')
    expect(formatPlayRate(100)).toBe('100%')
  })

  it('shows <1% for a rate above zero that rounds to zero', () => {
    expect(formatPlayRate((1 / 300) * 100)).toBe('<1%')
    expect(formatPlayRate(0.5)).toBe('1%')
  })
})

describe('rankTrendingCards — play-rate trend', () => {
  const ctx = (precedingRows: RankableCardRow[] | null, precedingTotal = 50) => ({
    selectedTotal: 50,
    precedingTotal,
    precedingRows,
  })

  it('shows a rise in percentage points vs the preceding window', () => {
    // 19/50 = 38% now; 15.9/50 = 31.8% before -> +6.2
    const [card] = rankTrendingCards([row('A', 60, 19)], { selectedTotal: 50, precedingTotal: 500, precedingRows: [prev('A', 159)] })
    expect(card.trend?.direction).toBe('up')
    expect(card.trend?.valuePct).toBeCloseTo(6.2, 5)
  })

  it('shows a fall', () => {
    // 191/500 = 38.2% now; 20/50 = 40% before -> -1.8
    const [card] = rankTrendingCards([row('A', 600, 191)], { selectedTotal: 500, precedingTotal: 50, precedingRows: [prev('A', 20)] })
    expect(card.trend?.direction).toBe('down')
    expect(card.trend?.valuePct).toBeCloseTo(-1.8, 5)
  })

  it('reads a change within the deadband as flat', () => {
    // 102/500 = 20.4% now; 10/50 = 20% before -> +0.4
    const [card] = rankTrendingCards([row('A', 300, 102)], { selectedTotal: 500, precedingTotal: 50, precedingRows: [prev('A', 10)] })
    expect(card.trend?.direction).toBe('flat')
  })

  it('treats a card absent from the preceding window as 0%', () => {
    const [card] = rankTrendingCards([row('A', 40, 10)], ctx([prev('Other', 5)]))
    expect(card.trend?.direction).toBe('up')
    expect(card.trend?.valuePct).toBeCloseTo(20, 5)
  })

  it('is suppressed for every card when the preceding slice is too thin', () => {
    const ranked = rankTrendingCards([row('A', 40, 10), row('B', 20, 5)], ctx([prev('A', 1)], 2))
    expect(ranked.map((c) => c.trend)).toEqual([null, null])
  })

  it('is suppressed when the preceding rows are unavailable', () => {
    const [card] = rankTrendingCards([row('A', 40, 10)], ctx(null))
    expect(card.trend).toBeNull()
    expect(card.playRatePct).toBeCloseTo(20, 5)
  })
})
