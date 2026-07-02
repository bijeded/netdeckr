import { describe, it, expect } from 'vitest'
import { placementBadge } from './placement'

describe('placementBadge', () => {
  it('labels 1st and 2nd distinctly', () => {
    expect(placementBadge('1')).toEqual({ label: '1st', kind: 'first' })
    expect(placementBadge('2')).toEqual({ label: '2nd', kind: 'second' })
  })

  it('labels a 3-4 finish as Top 4', () => {
    expect(placementBadge('3-4')).toEqual({ label: 'Top 4', kind: 'top4' })
    expect(placementBadge('4')).toEqual({ label: 'Top 4', kind: 'top4' })
  })

  it('labels deeper finishes as Top <upper bound>', () => {
    expect(placementBadge('5-8')).toEqual({ label: 'Top 8', kind: 'other' })
    expect(placementBadge('9-16')).toEqual({ label: 'Top 16', kind: 'other' })
  })

  it('falls back to the raw label when unparseable', () => {
    expect(placementBadge('')).toEqual({ label: '—', kind: 'other' })
    expect(placementBadge('DNF')).toEqual({ label: 'DNF', kind: 'other' })
  })
})
