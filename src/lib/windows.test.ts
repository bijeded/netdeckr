import { describe, it, expect } from 'vitest'
import {
  WINDOWS,
  DEFAULT_WINDOW,
  isWindowCode,
  normalizeWindow,
  type WindowCode,
} from './windows'

describe('windows', () => {
  it('lists the five MTGTop8 meta windows with i18n keys', () => {
    expect(WINDOWS.map((w) => w.code)).toEqual(['50', '326', '52', '46', '285'])
    const last2Weeks = WINDOWS.find((w) => w.code === '50')
    expect(last2Weeks?.i18nKey).toBe('windows.last2Weeks')
  })

  it('marks Last 2 Weeks (50) as the default window', () => {
    expect(DEFAULT_WINDOW).toBe('50')
    expect(WINDOWS.find((w) => w.isDefault)?.code).toBe('50')
  })

  it('validates known window codes', () => {
    expect(isWindowCode('326')).toBe(true)
    expect(isWindowCode('999')).toBe(false)
    expect(isWindowCode(null)).toBe(false)
    expect(isWindowCode(undefined)).toBe(false)
  })

  it('normalizes an unknown or missing code to the default', () => {
    expect(normalizeWindow('52')).toBe<WindowCode>('52')
    expect(normalizeWindow('nope')).toBe(DEFAULT_WINDOW)
    expect(normalizeWindow(null)).toBe(DEFAULT_WINDOW)
  })
})
