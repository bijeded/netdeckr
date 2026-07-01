import { describe, it, expect } from 'vitest'
import {
  WINDOWS,
  DEFAULT_WINDOW,
  isWindowCode,
  normalizeWindow,
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
})
