import { describe, it, expect } from 'vitest'
import {
  analysePerformance,
  funnelBucket,
  manaCurve,
  typeSplit,
  twoWeekDecks,
  wildcardCost,
  MIN_ANALYSIS_DECKS,
  type AnalysisDeck,
} from './archetypeAnalysis'
import type { StockCard } from './stockList'

const NOW = new Date('2026-10-16T12:00:00Z') // 2-week window starts 2026-10-02

let nextId = 1
function deck(overrides: Partial<AnalysisDeck> = {}): AnalysisDeck {
  return {
    id: nextId++,
    archetypeId: 1,
    archetypeName: 'Dimir Aggro',
    colorIdentity: 'UB',
    artImageUrl: null,
    artCropUrl: null,
    placement: '1',
    eventId: 100,
    eventDate: '2026-10-14',
    playerCount: 64,
    unranked: false,
    ...overrides,
  }
}

function card(overrides: Partial<StockCard> = {}): StockCard {
  return {
    quantity: 4,
    name: 'Card',
    scrapedName: 'Card',
    setCode: null,
    collectorNumber: null,
    imageUrl: null,
    thumbnailUrl: null,
    typeLine: 'Instant',
    cmc: 2,
    rarity: 'rare',
    ...overrides,
  }
}

describe('twoWeekDecks', () => {
  it('includes a deck from 10 days ago and drops older or date-less decks', () => {
    const tenDays = deck({ eventDate: '2026-10-06' })
    const old = deck({ eventDate: '2026-09-25' })
    const dateless = deck({ eventDate: null })
    expect(twoWeekDecks([tenDays, old, dateless], NOW)).toEqual([tenDays])
  })
})

describe('funnelBucket', () => {
  it('buckets standings by their leading number', () => {
    expect(['1', '2', '3-4', '5-8', '9-16', '', 'DNF'].map(funnelBucket)).toEqual([
      'first',
      'second',
      'top4',
      'top8',
      'deeper',
      null,
      null,
    ])
  })
})

describe('analysePerformance', () => {
  it('returns null for an archetype with no deck in the window', () => {
    expect(analysePerformance([deck({ eventDate: '2026-09-20' })], 'Dimir Aggro', NOW)).toBeNull()
  })

  it('computes share, wins, and deck/event counts over the 2-week field', () => {
    const corpus = [
      deck({ placement: '1', eventId: 1 }),
      deck({ placement: '5-8', eventId: 2 }),
      deck({ archetypeName: 'Izzet Cauldron', placement: '2', eventId: 1 }),
      deck({ archetypeName: 'Izzet Cauldron', placement: '3-4', eventId: 2 }),
    ]
    const perf = analysePerformance(corpus, 'Dimir Aggro', NOW)!
    expect(perf.sharePct).toBe(50)
    expect(perf.wins).toBe(1)
    expect(perf.deckCount).toBe(2)
    expect(perf.eventCount).toBe(2)
  })

  it('builds the funnel and top-8 rate from ranked decks only', () => {
    const corpus = [
      deck({ placement: '1' }),
      deck({ placement: '2' }),
      deck({ placement: '3-4' }),
      deck({ placement: '5-8' }),
      deck({ placement: '9-16' }),
      deck({ placement: '1', unranked: true, playerCount: null }),
      deck({ placement: '2', unranked: true, playerCount: null }),
    ]
    const perf = analysePerformance(corpus, 'Dimir Aggro', NOW)!
    expect(perf.funnel.map((p) => p.count)).toEqual([1, 1, 1, 1, 1])
    expect(perf.rankedDecks).toBe(5)
    expect(perf.unrankedDecks).toBe(2)
    expect(perf.top8Rate).toBe(80)
  })

  it('breaks decks down by event size class', () => {
    const corpus = [
      deck({ playerCount: 20, placement: '1' }),
      deck({ playerCount: 40, placement: '5-8' }),
      deck({ playerCount: 120, placement: '2' }),
      deck({ playerCount: 300, placement: '9-16' }),
      deck({ playerCount: null, placement: '3-4' }),
    ]
    const perf = analysePerformance(corpus, 'Dimir Aggro', NOW)!
    expect(perf.bySize.map((s) => [s.sizeClass, s.decks])).toEqual([
      ['small', 1],
      ['medium', 1],
      ['large', 1],
      ['massive', 1],
      ['unsized', 1],
    ])
    expect(perf.bySize[0].avgFinish).toBe(100)
    expect(perf.bySize[2].avgFinish).toBe(80)
  })

  it('plots share per day with gaps on days without events', () => {
    const corpus = [
      deck({ eventDate: '2026-10-10' }),
      deck({ eventDate: '2026-10-10', archetypeName: 'Other' }),
      deck({ eventDate: '2026-10-12', archetypeName: 'Other' }),
    ]
    const days = analysePerformance(corpus, 'Dimir Aggro', NOW)!.sharePerDay
    expect(days[0].date).toBe('2026-10-02')
    expect(days[days.length - 1].date).toBe('2026-10-16')
    const byDate = new Map(days.map((d) => [d.date, d.sharePct]))
    expect(byDate.get('2026-10-10')).toBe(50)
    expect(byDate.get('2026-10-12')).toBe(0)
    expect(byDate.get('2026-10-11')).toBeNull()
  })

  it('compares share with the preceding 2 weeks', () => {
    const corpus = [
      deck({ eventDate: '2026-10-14' }),
      deck({ eventDate: '2026-10-14', archetypeName: 'Other' }),
      // Preceding window: Dimir held 1 of 4 decks (25%) → now 50%.
      deck({ eventDate: '2026-09-25' }),
      deck({ eventDate: '2026-09-25', archetypeName: 'Other' }),
      deck({ eventDate: '2026-09-25', archetypeName: 'Other' }),
      deck({ eventDate: '2026-09-25', archetypeName: 'Other' }),
    ]
    const perf = analysePerformance(corpus, 'Dimir Aggro', NOW)!
    expect(perf.shareDelta).toEqual({ direction: 'up', valuePct: 25 })
  })
})

describe('manaCurve', () => {
  it('excludes lands and opens the top bucket', () => {
    const main = [
      card({ typeLine: 'Basic Land — Island', quantity: 24, cmc: 0 }),
      card({ name: 'Two', cmc: 2, quantity: 30 }),
      card({ name: 'Six', cmc: 6, quantity: 2 }),
      card({ name: 'Seven', cmc: 7, quantity: 2 }),
      card({ name: 'Nine', cmc: 9, quantity: 2 }),
    ]
    const curve = manaCurve(main)
    expect(curve.reduce((s, p) => s + p.count, 0)).toBe(36)
    expect(curve.find((p) => p.manaValue === '6+')?.count).toBe(6)
  })
})

describe('typeSplit', () => {
  it('counts lands, creatures, spells, and other', () => {
    const main = [
      card({ typeLine: 'Basic Land — Island', quantity: 24 }),
      card({ typeLine: 'Creature — Faerie', quantity: 20 }),
      card({ typeLine: 'Instant', quantity: 14 }),
      card({ typeLine: 'Artifact', quantity: 2 }),
    ]
    expect(typeSplit(main).map((p) => p.count)).toEqual([24, 20, 14, 2])
  })
})

describe('wildcardCost', () => {
  const main = [
    card({ name: 'Island', typeLine: 'Basic Land — Island', quantity: 20, rarity: 'common' }),
    card({ name: 'M', rarity: 'mythic', quantity: 4 }),
    card({ name: 'M2', rarity: 'mythic', quantity: 4 }),
    card({ name: 'R', rarity: 'rare', quantity: 4 }),
    card({ name: 'U', rarity: 'uncommon', quantity: 4 }),
    card({ name: 'C', rarity: 'common', quantity: 2 }),
  ]
  const side = [
    card({ name: 'R', rarity: 'rare', quantity: 2 }),
    card({ name: 'U2', rarity: 'uncommon', quantity: 2 }),
  ]

  it('counts wildcards for Standard, excluding basics and capping a card at a playset', () => {
    expect(wildcardCost(main, side, 'ST')).toEqual({ mythic: 8, rare: 4, uncommon: 6, common: 2 })
  })

  it('is absent outside Arena formats', () => {
    for (const format of ['MO', 'PAU', 'PREM'] as const) {
      expect(wildcardCost(main, side, format)).toBeNull()
    }
  })
})

describe('MIN_ANALYSIS_DECKS', () => {
  it('flags fewer than 5 decks as a small sample', () => {
    expect(4 < MIN_ANALYSIS_DECKS).toBe(true)
    expect(5 < MIN_ANALYSIS_DECKS).toBe(false)
  })
})
