import { describe, it, expect } from 'vitest'
import { tierFor } from './tiers'

describe('tierFor', () => {
  it('classifies share % into tiers per the design thresholds', () => {
    expect(tierFor(14.2)).toBe('T1')
    expect(tierFor(10)).toBe('T1')
    expect(tierFor(9.9)).toBe('T2')
    expect(tierFor(5)).toBe('T2')
    expect(tierFor(4.9)).toBe('T3')
    expect(tierFor(1)).toBe('T3')
    expect(tierFor(0.9)).toBe('Otros')
    expect(tierFor(0)).toBe('Otros')
  })
})
