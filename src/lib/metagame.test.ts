import { describe, it, expect } from 'vitest'
import {
  deriveBreakdown,
  attachPowerTiers,
  type DeckForBreakdown,
  type RankedArchetype,
} from './metagame'

function d(archetypeName: string, over: Partial<DeckForBreakdown> = {}): DeckForBreakdown {
  return { archetypeName, colorIdentity: '', placement: '1', artImageUrl: null, artCropUrl: null, ...over }
}

function ranked(name: string, over: Partial<RankedArchetype> = {}): RankedArchetype {
  return { rank: 1, name, colorIdentity: '', sharePct: 0, artImageUrl: null, artCropUrl: null, ...over }
}

describe('deriveBreakdown', () => {
  it('counts decks per archetype and computes share as count / total', () => {
    const b = deriveBreakdown([
      d('Izzet Lesson', { colorIdentity: 'UR' }),
      d('Izzet Lesson', { colorIdentity: 'UR' }),
      d('Mono Red', { colorIdentity: 'R' }),
    ])
    expect(b.map((x) => x.name)).toEqual(['Izzet Lesson', 'Mono Red'])
    expect(b.map((x) => x.rank)).toEqual([1, 2])
    expect(b[0].sharePct).toBeCloseTo(66.67, 1)
    expect(b[1].sharePct).toBeCloseTo(33.33, 1)
    expect(b[0].colorIdentity).toBe('UR')
  })

  it('ranks by deck count descending, then name ascending for ties', () => {
    const b = deriveBreakdown([d('Beta'), d('Beta'), d('Alpha'), d('Alpha'), d('Gamma')])
    // Alpha and Beta tie at 2 decks -> Alpha first (name asc); Gamma has 1.
    expect(b.map((x) => x.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(b.map((x) => x.rank)).toEqual([1, 2, 3])
  })

  it('carries the archetype art onto the share', () => {
    const b = deriveBreakdown([
      d('X', { artImageUrl: 'https://img/x.jpg', artCropUrl: 'https://crop/x.jpg' }),
    ])
    expect(b[0].artImageUrl).toBe('https://img/x.jpg')
    expect(b[0].artCropUrl).toBe('https://crop/x.jpg')
  })

  it('caps at the top 20 archetypes by share', () => {
    const decks: DeckForBreakdown[] = []
    for (let i = 0; i < 25; i++) {
      const name = `A${String(i).padStart(2, '0')}`
      for (let j = 0; j <= i; j++) decks.push(d(name)) // A24 has the most decks
    }
    const b = deriveBreakdown(decks)
    expect(b).toHaveLength(20)
    expect(b[0].name).toBe('A24')
  })

  it('ignores decks with no archetype name', () => {
    const b = deriveBreakdown([d('Real'), d('')])
    expect(b.map((x) => x.name)).toEqual(['Real'])
    expect(b[0].sharePct).toBeCloseTo(100, 1)
  })

  it('returns an empty breakdown for no decks', () => {
    expect(deriveBreakdown([])).toEqual([])
  })
})

describe('attachPowerTiers', () => {
  it('gives the strongest 2-week performer the top tier', () => {
    const twoWeekPlacements = new Map<string, string[]>([
      ['Dominant', Array(12).fill('1')],
      ['Weak', Array(12).fill('9-16')],
    ])
    const out = attachPowerTiers([ranked('Dominant', { rank: 1 }), ranked('Weak', { rank: 2 })], {
      twoWeekPlacements,
      twoWeekTopNames: ['Dominant', 'Weak'],
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    expect(byName['Dominant'].tier).toBe('T1')
    expect(['T2', 'T3', 'Otros']).toContain(byName['Weak'].tier)
  })

  it('keeps each archetype tier stable regardless of the selected window (always 2-week based)', () => {
    const twoWeekPlacements = new Map<string, string[]>([
      ['A', Array(10).fill('1')],
      ['B', Array(10).fill('5-8')],
      ['C', Array(10).fill('9-16')],
      ['D', Array(10).fill('17-32')],
    ])
    const topNames = ['A', 'B', 'C', 'D']
    const displayed = topNames.map((n, i) => ranked(n, { rank: i + 1 }))
    const baseline = attachPowerTiers(displayed, {
      twoWeekPlacements,
      twoWeekTopNames: topNames,
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const fiveDay = attachPowerTiers(displayed, {
      twoWeekPlacements,
      twoWeekTopNames: topNames,
      selectedPlacements: new Map([['A', Array(4).fill('9-16')]]),
      isBaseline: false,
    })
    for (const n of topNames) {
      expect(fiveDay.find((a) => a.name === n)!.tier).toBe(baseline.find((a) => a.name === n)!.tier)
    }
  })

  it('sets trend to null on the baseline (2-week) window', () => {
    const tw = new Map<string, string[]>([['A', Array(5).fill('1')]])
    const out = attachPowerTiers([ranked('A')], {
      twoWeekPlacements: tw,
      twoWeekTopNames: ['A'],
      selectedPlacements: tw,
      isBaseline: true,
    })
    expect(out[0].trend).toBeNull()
  })

  it('computes an up/down trend on a non-baseline window', () => {
    const tw = new Map<string, string[]>([
      ['Rising', ['9-16', '9-16', '9-16', '1']],
      ['Falling', ['1', '1', '1', '9-16']],
    ])
    const sel = new Map<string, string[]>([
      ['Rising', ['1', '1', '1', '2']],
      ['Falling', ['9-16', '9-16', '9-16', '17-32']],
    ])
    const out = attachPowerTiers([ranked('Rising'), ranked('Falling')], {
      twoWeekPlacements: tw,
      twoWeekTopNames: ['Rising', 'Falling'],
      selectedPlacements: sel,
      isBaseline: false,
    })
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    expect(byName['Rising'].trend).toBe('up')
    expect(byName['Falling'].trend).toBe('down')
  })

  it('preserves the ranked fields (share, rank, name, art) unchanged', () => {
    const out = attachPowerTiers(
      [ranked('X', { rank: 3, sharePct: 12.5, colorIdentity: 'UR', artCropUrl: 'https://crop/x.jpg' })],
      {
        twoWeekPlacements: new Map([['X', ['1', '1', '1']]]),
        twoWeekTopNames: ['X'],
        selectedPlacements: new Map([['X', ['1', '1', '1']]]),
        isBaseline: true,
      },
    )
    expect(out[0]).toMatchObject({ rank: 3, name: 'X', sharePct: 12.5, colorIdentity: 'UR', artCropUrl: 'https://crop/x.jpg' })
  })
})
