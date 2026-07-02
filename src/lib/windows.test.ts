import { describe, it, expect } from 'vitest'
import {
  WINDOWS,
  DEFAULT_WINDOW,
  WINDOW_DAYS,
  isWindowCode,
  normalizeWindow,
  windowStartISO,
  type WindowCode,
} from './windows'

describe('windows', () => {
  it('lists the three universal logical windows in order with i18n keys', () => {
    expect(WINDOWS.map((w) => w.code)).toEqual(['5days', '2weeks', '2months'])
    const last5Days = WINDOWS.find((w) => w.code === '5days')
    expect(last5Days?.i18nKey).toBe('windows.last5Days')
  })

  it('marks Last 5 Days as the default window', () => {
    expect(DEFAULT_WINDOW).toBe('5days')
    expect(WINDOWS.find((w) => w.isDefault)?.code).toBe('5days')
  })

  it('validates known window codes', () => {
    expect(isWindowCode('2weeks')).toBe(true)
    expect(isWindowCode('999')).toBe(false)
    expect(isWindowCode(null)).toBe(false)
    expect(isWindowCode(undefined)).toBe(false)
  })

  it('normalizes an unknown or missing code to the default', () => {
    expect(normalizeWindow('2months')).toBe<WindowCode>('2months')
    expect(normalizeWindow('nope')).toBe(DEFAULT_WINDOW)
    expect(normalizeWindow(null)).toBe(DEFAULT_WINDOW)
  })

  it('maps each window to its lookback in days', () => {
    expect(WINDOW_DAYS['5days']).toBe(5)
    expect(WINDOW_DAYS['2weeks']).toBe(14)
    expect(WINDOW_DAYS['2months']).toBe(60)
  })

  it('computes the window start as an ISO date N days before now', () => {
    const now = new Date('2026-07-01T12:00:00Z')
    expect(windowStartISO('5days', now)).toBe('2026-06-26')
    expect(windowStartISO('2weeks', now)).toBe('2026-06-17')
    expect(windowStartISO('2months', now)).toBe('2026-05-02')
  })
})
