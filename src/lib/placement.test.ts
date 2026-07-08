import { describe, it, expect } from 'vitest'
import { placementBadge, placementSortKey } from './placement'

describe('placementBadge', () => {
  it('labels 1st and 2nd distinctly', () => {
    expect(placementBadge('1')).toEqual({ label: '1st', kind: 'first' })
    expect(placementBadge('2')).toEqual({ label: '2nd', kind: 'second' })
  })

  it('labels a 3-4 finish as Top 4', () => {
    expect(placementBadge('3-4')).toEqual({ label: 'Top 4', kind: 'top4' })
    expect(placementBadge('4')).toEqual({ label: 'Top 4', kind: 'top4' })
  })

  it('labels deeper bracket ranges as Top <upper bound>', () => {
    expect(placementBadge('5-8')).toEqual({ label: 'Top 8', kind: 'other' })
    expect(placementBadge('9-16')).toEqual({ label: 'Top 16', kind: 'other' })
    expect(placementBadge('17-32')).toEqual({ label: 'Top 32', kind: 'other' })
  })

  it('shows a bare number for a single standing worse than 8th', () => {
    expect(placementBadge('9')).toEqual({ label: '9', kind: 'other' })
    expect(placementBadge('14')).toEqual({ label: '14', kind: 'other' })
  })

  it('keeps Top <n> for a single standing of 8th or better', () => {
    expect(placementBadge('8')).toEqual({ label: 'Top 8', kind: 'other' })
  })

  it('falls back to the raw label when unparseable', () => {
    expect(placementBadge('')).toEqual({ label: '—', kind: 'other' })
    expect(placementBadge('DNF')).toEqual({ label: 'DNF', kind: 'other' })
  })
})

describe('placementSortKey', () => {
  it('ranks by the first integer, best (lowest) first', () => {
    const order = ['5-8', '1', '3-4', '2'].sort((a, b) => placementSortKey(a) - placementSortKey(b))
    expect(order).toEqual(['1', '2', '3-4', '5-8'])
  })

  it('sorts unparseable finishes last', () => {
    expect(placementSortKey('DNF')).toBe(Number.POSITIVE_INFINITY)
    expect(placementSortKey('')).toBe(Number.POSITIVE_INFINITY)
  })
})
