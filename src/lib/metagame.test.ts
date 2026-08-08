import { describe, it, expect } from 'vitest'
import {
  deriveBreakdown,
  attachPowerTiers,
  GRID_DISPLAY_CAP,
  type DeckForBreakdown,
  type RankedArchetype,
} from './metagame'

function d(archetypeName: string, over: Partial<DeckForBreakdown> = {}): DeckForBreakdown {
  return { archetypeName, colorIdentity: '', placement: '1', artImageUrl: null, artCropUrl: null, ...over }
}

function ranked(name: string, over: Partial<RankedArchetype> = {}): RankedArchetype {
  return { rank: 1, name, colorIdentity: '', sharePct: 0, wins: 0, artImageUrl: null, artCropUrl: null, ...over }
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

  it('returns every archetype uncapped by default (no hard cut)', () => {
    const decks: DeckForBreakdown[] = []
    for (let i = 0; i < 25; i++) {
      const name = `A${String(i).padStart(2, '0')}`
      for (let j = 0; j <= i; j++) decks.push(d(name)) // A24 has the most decks
    }
    const b = deriveBreakdown(decks)
    expect(b).toHaveLength(25)
    expect(b[0].name).toBe('A24')
    // Ranks stay contiguous across the whole list.
    expect(b.map((x) => x.rank)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1))
  })

  it('caps to the top N by share when a cap is passed', () => {
    const decks: DeckForBreakdown[] = []
    for (let i = 0; i < 25; i++) {
      const name = `A${String(i).padStart(2, '0')}`
      for (let j = 0; j <= i; j++) decks.push(d(name))
    }
    const b = deriveBreakdown(decks, GRID_DISPLAY_CAP)
    expect(b).toHaveLength(GRID_DISPLAY_CAP)
    expect(b[0].name).toBe('A24')
  })

  it('exposes a grid display cap of 12', () => {
    expect(GRID_DISPLAY_CAP).toBe(12)
  })

  it('ignores decks with no archetype name', () => {
    const b = deriveBreakdown([d('Real'), d('')])
    expect(b.map((x) => x.name)).toEqual(['Real'])
    expect(b[0].sharePct).toBeCloseTo(100, 1)
  })

  it('returns an empty breakdown for no decks', () => {
    expect(deriveBreakdown([])).toEqual([])
  })

  it('counts first-place decks per archetype as wins', () => {
    const b = deriveBreakdown([
      d('Izzet Lesson', { placement: '1' }),
      d('Izzet Lesson', { placement: '1' }),
      d('Izzet Lesson', { placement: '3-4' }),
      d('Mono Red', { placement: '2' }),
    ])
    const izzet = b.find((x) => x.name === 'Izzet Lesson')!
    const mono = b.find((x) => x.name === 'Mono Red')!
    // Only exact 1st-place finishes count; "3-4" and "2" do not.
    expect(izzet.wins).toBe(2)
    expect(mono.wins).toBe(0)
  })

  it('reports zero wins when an archetype never finished first', () => {
    const b = deriveBreakdown([d('Control', { placement: '5-8' }), d('Control', { placement: '9-16' })])
    expect(b[0].wins).toBe(0)
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
      twoWeekFieldNames: ['Dominant', 'Weak'],
      twoWeekSizes: new Map(),
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
      twoWeekFieldNames: topNames,
      twoWeekSizes: new Map(),
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const fiveDay = attachPowerTiers(displayed, {
      twoWeekPlacements,
      twoWeekFieldNames: topNames,
      twoWeekSizes: new Map(),
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
      twoWeekFieldNames: ['A'],
      twoWeekSizes: new Map(),
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
      twoWeekFieldNames: ['Rising', 'Falling'],
      twoWeekSizes: new Map(),
      selectedPlacements: sel,
      isBaseline: false,
    })
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    expect(byName['Rising'].trend).toBe('up')
    expect(byName['Falling'].trend).toBe('down')
  })

  it('attaches a tier to every archetype, even beyond the top 20, against a whole-corpus field', () => {
    const twoWeekPlacements = new Map<string, string[]>()
    const names: string[] = []
    for (let i = 0; i < 30; i++) {
      const name = `A${String(i).padStart(2, '0')}`
      names.push(name)
      // Strong finishers at the top of the list, weak at the tail.
      twoWeekPlacements.set(name, Array(6).fill(i < 10 ? '1' : i < 20 ? '5-8' : '17-32'))
    }
    const displayed = names.map((n, i) => ranked(n, { rank: i + 1 }))
    const out = attachPowerTiers(displayed, {
      twoWeekPlacements,
      twoWeekFieldNames: names, // whole corpus is the reference field
      twoWeekSizes: new Map(),
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    expect(out).toHaveLength(30)
    for (const a of out) expect(a.tier).toBeTruthy()
    // A tail archetype still receives a (weak) tier, not undefined.
    expect(out[29].tier).toBeTruthy()
  })

  it('preserves the ranked fields (share, rank, name, art) unchanged', () => {
    const out = attachPowerTiers(
      [ranked('X', { rank: 3, sharePct: 12.5, colorIdentity: 'UR', artCropUrl: 'https://crop/x.jpg' })],
      {
        twoWeekPlacements: new Map([['X', ['1', '1', '1']]]),
        twoWeekFieldNames: ['X'],
        twoWeekSizes: new Map(),
        selectedPlacements: new Map([['X', ['1', '1', '1']]]),
        isBaseline: true,
      },
    )
    expect(out[0]).toMatchObject({ rank: 3, name: 'X', sharePct: 12.5, colorIdentity: 'UR', artCropUrl: 'https://crop/x.jpg' })
  })

  it('keeps a single-deck event winner out of T1 via the deck floor', () => {
    // OneWin: a lone 1st place. Proven: many strong finishes. Both top-class by
    // score, but the floor bars OneWin from T1 (drops to T2), not the fringe.
    const twoWeekPlacements = new Map<string, string[]>([
      ['OneWin', ['1']],
      ['Proven', Array(12).fill('1')],
      ['Weak', Array(12).fill('17-32')],
    ])
    const names = ['OneWin', 'Proven', 'Weak']
    const out = attachPowerTiers(names.map((n, i) => ranked(n, { rank: i + 1 })), {
      twoWeekPlacements,
      twoWeekFieldNames: names,
      twoWeekSizes: new Map(),
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    expect(byName['Proven'].tier).toBe('T1')
    expect(byName['OneWin'].tier).not.toBe('T1')
    expect(byName['OneWin'].tier).not.toBe('Otros') // floored to T2, not fringe
  })

  it('computes the same trend regardless of tournament sizes (trend stays unweighted)', () => {
    const twoWeekPlacements = new Map<string, string[]>([['Rising', ['9-16', '9-16', '9-16', '1']]])
    const selectedPlacements = new Map<string, string[]>([['Rising', ['1', '1', '1', '2']]])
    const ctx = (twoWeekSizes: Map<string, (number | null)[]>) =>
      attachPowerTiers([ranked('Rising')], {
        twoWeekPlacements,
        twoWeekFieldNames: ['Rising'],
        twoWeekSizes,
        selectedPlacements,
        isBaseline: false,
      })[0].trend
    // Wildly different sizes must not move the trend arrow.
    expect(ctx(new Map([['Rising', [500, 500, 500, 500]]]))).toBe(
      ctx(new Map([['Rising', [4, 4, 4, 4]]])),
    )
  })

  it('weights larger tournaments higher when scoring the tier', () => {
    // Same finishes; BigEvents earned them at large tournaments, SmallEvents at
    // tiny ones. Size weighting must give BigEvents the stronger (higher) tier.
    const placements = Array(6).fill('1')
    const twoWeekPlacements = new Map<string, string[]>([
      ['BigEvents', placements],
      ['SmallEvents', placements],
    ])
    const twoWeekSizes = new Map<string, (number | null)[]>([
      ['BigEvents', Array(6).fill(256)],
      ['SmallEvents', Array(6).fill(8)],
    ])
    const names = ['BigEvents', 'SmallEvents']
    const out = attachPowerTiers(names.map((n, i) => ranked(n, { rank: i + 1 })), {
      twoWeekPlacements,
      twoWeekFieldNames: names,
      twoWeekSizes,
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const order = ['T1', 'T2', 'T3', 'Otros']
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    // BigEvents is at least as strong a tier as SmallEvents (never weaker).
    expect(order.indexOf(byName['BigEvents'].tier)).toBeLessThanOrEqual(
      order.indexOf(byName['SmallEvents'].tier),
    )
  })
  it('flattens unranked finishes so a published ladder cannot mint a champion', () => {
    // Identical records and identical event sizes — the ONLY difference is that
    // Ladder's finishes are flagged unranked. Holding sizes constant is what
    // makes this test discriminating: in production an unranked event is always
    // also unsized, so its weight floor would otherwise do the separating.
    const placements = Array(6).fill('1')
    const twoWeekPlacements = new Map<string, string[]>([
      ['Ladder', placements],
      ['Bracket', placements],
    ])
    const twoWeekSizes = new Map<string, (number | null)[]>([
      ['Ladder', Array(6).fill(64)],
      ['Bracket', Array(6).fill(64)],
    ])
    const twoWeekUnranked = new Map<string, boolean[]>([
      ['Ladder', Array(6).fill(true)],
      ['Bracket', Array(6).fill(false)],
    ])
    const names = ['Ladder', 'Bracket']
    const out = attachPowerTiers(names.map((n, i) => ranked(n, { rank: i + 1 })), {
      twoWeekPlacements,
      twoWeekFieldNames: names,
      twoWeekSizes,
      twoWeekUnranked,
      selectedPlacements: twoWeekPlacements,
      isBaseline: true,
    })
    const order = ['T1', 'T2', 'T3', 'Otros']
    const byName = Object.fromEntries(out.map((a) => [a.name, a]))
    // Six fabricated 1st places must land strictly below six real ones.
    expect(order.indexOf(byName['Ladder'].tier)).toBeGreaterThan(
      order.indexOf(byName['Bracket'].tier),
    )
  })
})
