import { describe, it, expect } from 'vitest'
import {
  finishQuality,
  meanQuality,
  wilsonLowerBound,
  archetypePowerScore,
  sizeWeight,
  jenksBreaks,
  assignTiers,
  windowTrend,
  isUnrankedEvent,
  T1_MIN_DECKS,
} from './powerScore'

describe('finishQuality', () => {
  it('maps standing brackets to decreasing quality', () => {
    expect(finishQuality('1')).toBe(1.0)
    expect(finishQuality('2')).toBe(0.8)
    expect(finishQuality('3-4')).toBe(0.65)
    expect(finishQuality('5-8')).toBe(0.45)
    expect(finishQuality('9-16')).toBe(0.3)
    expect(finishQuality('17-32')).toBe(0.18)
    expect(finishQuality('33-64')).toBe(0.1)
  })

  it('buckets bare Swiss ranks by their leading number', () => {
    expect(finishQuality('3')).toBe(0.65) // top-4 bucket
    expect(finishQuality('8')).toBe(0.45) // top-8 bucket
    expect(finishQuality('12')).toBe(0.3) // top-16 bucket
    expect(finishQuality('40')).toBe(0.1) // beyond
  })

  it('is strictly non-increasing as the standing worsens', () => {
    const qs = ['1', '2', '3-4', '5-8', '9-16', '17-32', '33'].map(finishQuality) as number[]
    for (let i = 1; i < qs.length; i++) expect(qs[i]).toBeLessThan(qs[i - 1])
  })

  it('returns null for empty or unparseable placements', () => {
    expect(finishQuality('')).toBeNull()
    expect(finishQuality('DNF')).toBeNull()
  })
})

describe('meanQuality', () => {
  it('averages the usable qualities', () => {
    expect(meanQuality(['1', '2'])).toBeCloseTo(0.9, 5)
  })

  it('ignores unusable placements', () => {
    expect(meanQuality(['1', '', 'DNF'])).toBeCloseTo(1.0, 5)
  })

  it('returns null when nothing is usable', () => {
    expect(meanQuality(['', 'x'])).toBeNull()
    expect(meanQuality([])).toBeNull()
  })
})

describe('wilsonLowerBound', () => {
  it('never exceeds pHat and stays within [0,1]', () => {
    for (const [p, n] of [
      [1, 1],
      [0.5, 3],
      [0.9, 10],
      [0.2, 50],
    ] as const) {
      const lb = wilsonLowerBound(p, n)
      expect(lb).toBeLessThanOrEqual(p)
      expect(lb).toBeGreaterThanOrEqual(0)
      expect(lb).toBeLessThanOrEqual(1)
    }
  })

  it('rises toward pHat as n grows for a fixed pHat', () => {
    const small = wilsonLowerBound(0.8, 2)
    const big = wilsonLowerBound(0.8, 200)
    expect(big).toBeGreaterThan(small)
    expect(big).toBeGreaterThan(0.7) // large n ≈ pHat
  })

  it('shrinks a single perfect result far below 1', () => {
    expect(wilsonLowerBound(1, 1)).toBeLessThan(0.6)
  })

  it('returns 0 for a non-positive sample size', () => {
    expect(wilsonLowerBound(1, 0)).toBe(0)
  })

  it('clamps an out-of-range pHat instead of returning NaN', () => {
    const lb = wilsonLowerBound(1.5, 10)
    expect(Number.isNaN(lb)).toBe(false)
    expect(lb).toBeGreaterThanOrEqual(0)
    expect(lb).toBeLessThanOrEqual(1)
  })
})

describe('archetypePowerScore', () => {
  it('returns 0 when there are no usable placements', () => {
    expect(archetypePowerScore(['', 'x'])).toBe(0)
    expect(archetypePowerScore([])).toBe(0)
  })

  it('does not decrease when finishes get deeper', () => {
    const shallow = archetypePowerScore(['9-16', '9-16', '9-16', '9-16'])
    const deep = archetypePowerScore(['1', '2', '3-4', '5-8'])
    expect(deep).toBeGreaterThan(shallow)
  })

  it('rewards depth over volume: a few deep beats many shallow', () => {
    const manyShallow = archetypePowerScore(Array(40).fill('9-16'))
    const fewDeep = archetypePowerScore(['1', '1', '2', '3-4', '3-4', '5-8'])
    expect(fewDeep).toBeGreaterThan(manyShallow)
  })

  it('scales onto a 0..100 range', () => {
    const s = archetypePowerScore(Array(30).fill('1'))
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})

describe('sizeWeight', () => {
  it('increases with tournament size in the unclamped range', () => {
    expect(sizeWeight(128)).toBeGreaterThan(sizeWeight(32))
  })

  it('treats a missing size as a small event (the floor)', () => {
    // Unsized == the floor, which equals a genuinely tiny event's weight.
    expect(sizeWeight(null)).toBe(sizeWeight(1))
    expect(sizeWeight(null)).toBeLessThan(sizeWeight(128))
  })

  it('is bounded against an implausible recorded size', () => {
    // The bound is a data-sanity guard, not a calibration cap: it sits far above
    // any real field, so only an absurd player count ever reaches it.
    expect(sizeWeight(100000)).toBeLessThanOrEqual(sizeWeight(100001))
    expect(sizeWeight(100000)).toBe(sizeWeight(1e9))
    expect(sizeWeight(1086)).toBeLessThan(sizeWeight(100000))
  })

  it('is continuous at the reference size', () => {
    // Both branches evaluate to exactly 1.0 at SIZE_REF, so there is no seam.
    expect(sizeWeight(64)).toBe(1)
    expect(sizeWeight(63.9)).toBeLessThan(1)
    expect(sizeWeight(64.1)).toBeGreaterThan(1)
  })

  it('adds a fixed increment per doubling above the reference', () => {
    const a = sizeWeight(128)
    const b = sizeWeight(256)
    const c = sizeWeight(512)
    expect(b - a).toBeCloseTo(c - b, 10)
    expect(b - a).toBeCloseTo(1, 10)
  })

  it('keeps very large events distinguishable from one another', () => {
    // The defect this replaced: a linear curve capped at 2.5 bound at 160
    // players, collapsing every event from 256 to 1086 onto one weight.
    expect(sizeWeight(256)).toBeLessThan(sizeWeight(512))
    expect(sizeWeight(512)).toBeLessThan(sizeWeight(1086))
  })

  it('weights events at or below the reference size exactly as before', () => {
    // The sub-reference curve is unchanged, which is what keeps this change's
    // blast radius confined to the events above the reference.
    expect(sizeWeight(64)).toBe(1)
    expect(sizeWeight(32)).toBe(0.5)
    expect(sizeWeight(48)).toBe(0.75)
    expect(sizeWeight(8)).toBe(0.35) // floored, as before
  })
})

describe('archetypePowerScore — tournament-size weighting', () => {
  it('scores identical finishes higher when earned at larger tournaments', () => {
    const placements = ['1', '2', '3-4', '5-8']
    const large = archetypePowerScore(placements, [200, 200, 200, 200])
    const tiny = archetypePowerScore(placements, [8, 8, 8, 8])
    expect(large).toBeGreaterThan(tiny)
  })

  it('treats a null size as a small event rather than dropping the finish', () => {
    const placements = ['1', '2', '3-4']
    const allNull = archetypePowerScore(placements, [null, null, null])
    const allTiny = archetypePowerScore(placements, [1, 1, 1])
    expect(allNull).toBeGreaterThan(0)
    expect(allNull).toBeCloseTo(allTiny, 5) // null == small default
  })

  it('degrades gracefully when no sizes are known (uniform weight, no error)', () => {
    const s = archetypePowerScore(['1', '2', '3-4'], [null, null, null])
    expect(Number.isNaN(s)).toBe(false)
    expect(s).toBeGreaterThan(0)
  })

  it('still rewards depth over volume when tournament size is held constant', () => {
    // Isolate depth-vs-volume by giving every finish the same size (weight): a
    // large pile of shallow finishes must not out-score a few deep ones.
    const manyShallow = archetypePowerScore(Array(40).fill('9-16'), Array(40).fill(64))
    const fewDeep = archetypePowerScore(
      ['1', '1', '2', '3-4', '3-4', '5-8'],
      Array(6).fill(64),
    )
    expect(fewDeep).toBeGreaterThan(manyShallow)
  })
})

describe('jenksBreaks', () => {
  it('finds the natural gap of a clearly bimodal set', () => {
    expect(jenksBreaks([1, 2, 3, 100, 101, 102], 2)).toEqual([100])
  })

  it('degrades to the number of distinct values when classes is too high', () => {
    expect(jenksBreaks([10, 20], 4)).toEqual([20]) // 2 distinct → 1 interior break
  })

  it('returns no breaks for a single distinct value', () => {
    expect(jenksBreaks([5, 5, 5], 4)).toEqual([])
  })

  it('is deterministic for identical input', () => {
    const a = jenksBreaks([3, 1, 2, 50, 51, 9, 10], 3)
    const b = jenksBreaks([3, 1, 2, 50, 51, 9, 10], 3)
    expect(a).toEqual(b)
  })
})

describe('assignTiers', () => {
  it('maps the strongest cluster to T1 down to the fringe', () => {
    const scores = new Map<string, number>([
      ['Dominant', 80],
      ['Strong', 60],
      ['Mid', 40],
      ['Weak', 12],
    ])
    const tiers = assignTiers(scores, [...scores.values()])
    expect(tiers.get('Dominant')).toBe('T1')
    expect(tiers.get('Strong')).toBe('T2')
    expect(tiers.get('Mid')).toBe('T3')
    expect(tiers.get('Weak')).toBe('Otros')
  })

  it('maps from the top when there are fewer than four distinct scores', () => {
    const scores = new Map<string, number>([
      ['A', 90],
      ['B', 30],
    ])
    const tiers = assignTiers(scores, [...scores.values()])
    expect(tiers.get('A')).toBe('T1')
    expect(tiers.get('B')).toBe('T2') // no T3/Otros for a two-value field
  })

  it('puts a no-usable-data archetype (score 0) in the fringe tier', () => {
    const scores = new Map<string, number>([
      ['Good', 70],
      ['NoData', 0],
    ])
    const tiers = assignTiers(scores, [70, 55, 40, 20])
    expect(tiers.get('NoData')).toBe('Otros')
    expect(tiers.get('Good')).toBe('T1')
  })

  it('is deterministic for identical input', () => {
    const scores = new Map<string, number>([
      ['A', 80],
      ['B', 80],
      ['C', 20],
    ])
    const ref = [80, 80, 20, 55]
    expect(assignTiers(scores, ref)).toEqual(assignTiers(scores, ref))
  })

  it('demotes a below-floor top scorer out of T1 (down to T2, not the fringe)', () => {
    const scores = new Map<string, number>([
      ['LuckyWinner', 80], // top-class score but only 1 deck
      ['Proven', 80], // same top class, well supported
    ])
    const ref = [80, 80, 40, 12]
    const deckCounts = new Map<string, number>([
      ['LuckyWinner', 1],
      ['Proven', 20],
    ])
    const tiers = assignTiers(scores, ref, { deckCounts, t1MinDecks: T1_MIN_DECKS })
    expect(tiers.get('LuckyWinner')).toBe('T2') // floored out of T1, not fringe
    expect(tiers.get('Proven')).toBe('T1')
  })

  it('leaves T1 intact when the top scorer clears the deck floor', () => {
    const scores = new Map<string, number>([
      ['Dominant', 80],
      ['Weak', 12],
    ])
    const ref = [80, 60, 40, 12]
    const deckCounts = new Map<string, number>([
      ['Dominant', T1_MIN_DECKS], // exactly at the floor → eligible
      ['Weak', 8],
    ])
    expect(assignTiers(scores, ref, { deckCounts }).get('Dominant')).toBe('T1')
  })

  it('applies no floor when deck counts are not supplied', () => {
    const scores = new Map<string, number>([['Solo', 80]])
    expect(assignTiers(scores, [80, 60, 40, 12]).get('Solo')).toBe('T1')
  })
})

describe('windowTrend', () => {
  const rep = (placement: string, k: number) => Array(k).fill(placement) as string[]

  it('returns up when recent quality beats the baseline beyond the deadband', () => {
    expect(windowTrend(rep('1', 4), ['9-16', '9-16', '1'])).toBe('up')
  })

  it('returns down when recent quality trails the baseline', () => {
    expect(windowTrend(rep('9-16', 4), ['1', '1', '2'])).toBe('down')
  })

  it('returns flat within the deadband', () => {
    expect(windowTrend(rep('3-4', 4), ['3-4', '3-4', '3-4'])).toBe('flat')
  })

  it('returns flat when the recent sample is below the minimum-deck guard', () => {
    expect(windowTrend(['1', '1'], ['9-16', '9-16', '9-16', '9-16'])).toBe('flat')
  })

  it('returns flat when there is no usable recent data', () => {
    expect(windowTrend(['', 'x'], ['1', '1', '1'])).toBe('flat')
  })
})

describe('isUnrankedEvent', () => {
  it('flags an unsized event whose standings are a flat run', () => {
    // The MTGO League shape: every 5-0 deck published, numbered by row.
    expect(isUnrankedEvent(['1', '2', '3', '4', '5', '6', '7', '8'], null)).toBe(true)
  })

  it('treats a bracket range as proof of a real bracket', () => {
    // Genuine tournaments that simply lack a headcount — local RCQs and stages.
    expect(isUnrankedEvent(['1', '2', '3-4', '5-8'], null)).toBe(false)
    expect(isUnrankedEvent(['1', '2', '3-4'], null)).toBe(false)
  })

  it('treats a recorded player count as proof of a real field', () => {
    expect(isUnrankedEvent(['1', '2', '3', '4'], 40)).toBe(false)
  })

  it('is ranked when both signals are present', () => {
    expect(isUnrankedEvent(['1', '2', '3-4', '5-8', '9-16'], 448)).toBe(false)
  })

  it('does not treat a zero or negative player count as a real field', () => {
    // Matches how sizeClassOf and sizeWeight read a non-positive count: absent.
    expect(isUnrankedEvent(['1', '2', '3'], 0)).toBe(true)
  })
})

describe('archetypePowerScore — unranked events', () => {
  const flat = ['1', '2', '3', '4', '5', '6', '7', '8']

  it('credits no champion-grade finish to an unranked event', () => {
    // A flat run read positionally mints a 1.0 champion and a 0.8 finalist; the
    // same decks scored as unranked must land strictly below an actual champion.
    const asRanked = archetypePowerScore(flat, Array(8).fill(64))
    const asUnranked = archetypePowerScore(flat, Array(8).fill(64), Array(8).fill(true))
    expect(asUnranked).toBeLessThan(asRanked)
  })

  it('keeps unranked decks in the sample rather than dropping them', () => {
    // Same finishes, all unranked: dropping them would collapse the score to 0.
    const scored = archetypePowerScore(flat, Array(8).fill(64), Array(8).fill(true))
    expect(scored).toBeGreaterThan(0)
    // And more of them is a larger sample, so the Wilson shrink loosens.
    const more = archetypePowerScore(
      Array(24).fill('1'),
      Array(24).fill(64),
      Array(24).fill(true),
    )
    expect(more).toBeGreaterThan(scored)
  })

  it('scores every deck of an unranked event identically', () => {
    // Position must not matter once the event is flagged, so a run of 1s and a
    // run of 8s score the same.
    const firsts = archetypePowerScore(Array(8).fill('1'), Array(8).fill(64), Array(8).fill(true))
    const eighths = archetypePowerScore(Array(8).fill('8'), Array(8).fill(64), Array(8).fill(true))
    expect(firsts).toBe(eighths)
  })

  it('leaves ranked finishes untouched when the flag is absent or false', () => {
    const sizes = Array(4).fill(64)
    const placements = ['1', '2', '3-4', '5-8']
    expect(archetypePowerScore(placements, sizes, [false, false, false, false])).toBe(
      archetypePowerScore(placements, sizes),
    )
  })

  it('applies the flag per finish, not per archetype', () => {
    // An archetype with one real win and one ladder finish must sit between the
    // two homogeneous cases.
    const sizes = [64, 64]
    const mixed = archetypePowerScore(['1', '1'], sizes, [false, true])
    const bothReal = archetypePowerScore(['1', '1'], sizes, [false, false])
    const bothLadder = archetypePowerScore(['1', '1'], sizes, [true, true])
    expect(mixed).toBeLessThan(bothReal)
    expect(mixed).toBeGreaterThan(bothLadder)
  })
})
