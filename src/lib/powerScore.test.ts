import { describe, it, expect } from 'vitest'
import {
  finishQuality,
  meanQuality,
  wilsonLowerBound,
  archetypePowerScore,
  jenksBreaks,
  assignTiers,
  windowTrend,
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
