import { describe, it, expect } from 'vitest'
import {
  WINDOWS,
  DEFAULT_WINDOW,
  WINDOW_DAYS,
  isWindowCode,
  normalizeWindow,
  windowStartISO,
  CORPUS_FETCH_DAYS,
  corpusFetchStartISO,
  type WindowCode,
} from './windows'

describe('windows', () => {
  it('lists the two supported logical windows in order with i18n keys', () => {
    expect(WINDOWS.map((w) => w.code)).toEqual(['5days', '2weeks'])
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

  it('normalizes an unknown, missing, or retired code to the default', () => {
    expect(normalizeWindow('2months')).toBe<WindowCode>(DEFAULT_WINDOW)
    expect(normalizeWindow('nope')).toBe(DEFAULT_WINDOW)
    expect(normalizeWindow(null)).toBe(DEFAULT_WINDOW)
  })

  it('does not recognize the retired 2months code', () => {
    expect(isWindowCode('2months')).toBe(false)
  })

  it('maps each window to its lookback in days', () => {
    expect(WINDOW_DAYS['5days']).toBe(5)
    expect(WINDOW_DAYS['2weeks']).toBe(14)
  })

  it('computes the window start as an ISO date N days before now', () => {
    const now = new Date('2026-07-01T12:00:00Z')
    expect(windowStartISO('5days', now)).toBe('2026-06-26')
    expect(windowStartISO('2weeks', now)).toBe('2026-06-17')
  })

  it('fetches two 2-week windows so the preceding equal-length slice is available', () => {
    // 2 × 14 = 28 days, so both the selected window and its preceding slice fit.
    expect(CORPUS_FETCH_DAYS).toBe(28)
  })

  it('computes the corpus fetch start as an ISO date CORPUS_FETCH_DAYS before now', () => {
    const now = new Date('2026-07-01T12:00:00Z')
    expect(corpusFetchStartISO(now)).toBe('2026-06-03') // 28 days before
  })
})
