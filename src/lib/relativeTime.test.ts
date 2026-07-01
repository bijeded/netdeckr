import { describe, it, expect } from 'vitest'
import { relativeTimeFromNow } from './relativeTime'

const now = new Date('2026-07-01T12:00:00Z')

describe('relativeTimeFromNow', () => {
  it('formats hours ago in English', () => {
    expect(relativeTimeFromNow('2026-07-01T10:00:00Z', now, 'en')).toBe('2 hours ago')
  })

  it('formats hours ago in Spanish', () => {
    expect(relativeTimeFromNow('2026-07-01T10:00:00Z', now, 'es')).toBe('hace 2 horas')
  })

  it('formats minutes ago', () => {
    expect(relativeTimeFromNow('2026-07-01T11:30:00Z', now, 'en')).toBe('30 minutes ago')
  })

  it('formats days ago', () => {
    expect(relativeTimeFromNow('2026-06-29T12:00:00Z', now, 'en')).toBe('2 days ago')
  })

  it('returns an empty string for an invalid timestamp', () => {
    expect(relativeTimeFromNow('not-a-date', now, 'en')).toBe('')
  })
})
