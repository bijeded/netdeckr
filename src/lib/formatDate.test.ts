import { describe, it, expect } from 'vitest'
import { formatShortDate } from './formatDate'

describe('formatShortDate', () => {
  it('formats an ISO date as abbreviated day + month', () => {
    // en-US renders "Jul 5"; assert both tokens regardless of order.
    expect(formatShortDate('2026-07-05', 'en-US')).toMatch(/Jul.*5|5.*Jul/)
  })

  it('localizes the month for Spanish', () => {
    expect(formatShortDate('2026-07-05', 'es').toLowerCase()).toContain('jul')
  })

  it('returns an empty string for empty input', () => {
    expect(formatShortDate('', 'en-US')).toBe('')
  })

  it('returns an empty string for an unparseable date', () => {
    expect(formatShortDate('not-a-date', 'en-US')).toBe('')
  })
})
