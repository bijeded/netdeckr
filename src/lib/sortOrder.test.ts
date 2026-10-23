import { describe, it, expect } from 'vitest'
import { SORT_ORDERS, DEFAULT_SORT_ORDER, isSortOrder, normalizeSortOrder } from './sortOrder'

describe('sortOrder', () => {
  it('offers Popular then Power, defaulting to Popular', () => {
    expect(SORT_ORDERS).toEqual(['popular', 'power'])
    expect(DEFAULT_SORT_ORDER).toBe('popular')
  })

  it('validates known orders', () => {
    expect(isSortOrder('power')).toBe(true)
    expect(isSortOrder('popular')).toBe(true)
    expect(isSortOrder('score')).toBe(false)
    expect(isSortOrder(null)).toBe(false)
  })

  it('falls back to Popular for an unknown or missing value', () => {
    expect(normalizeSortOrder('power')).toBe('power')
    expect(normalizeSortOrder('POWER')).toBe('popular')
    expect(normalizeSortOrder(undefined)).toBe('popular')
  })
})
