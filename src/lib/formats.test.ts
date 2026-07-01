import { describe, it, expect } from 'vitest'
import {
  FORMATS,
  DEFAULT_FORMAT,
  isFormatCode,
  normalizeFormat,
  type FormatCode,
} from './formats'

describe('formats', () => {
  it('lists the five supported formats with i18n keys', () => {
    expect(FORMATS.map((f) => f.code)).toEqual(['ST', 'PI', 'MO', 'PAU', 'PREM'])
    const standard = FORMATS.find((f) => f.code === 'ST')
    expect(standard?.i18nKey).toBe('formats.standard')
  })

  it('defaults to Standard', () => {
    expect(DEFAULT_FORMAT).toBe('ST')
  })

  it('validates known format codes', () => {
    expect(isFormatCode('MO')).toBe(true)
    expect(isFormatCode('XX')).toBe(false)
    expect(isFormatCode(null)).toBe(false)
    expect(isFormatCode(undefined)).toBe(false)
  })

  it('normalizes an unknown or missing code to the default', () => {
    expect(normalizeFormat('PI')).toBe<FormatCode>('PI')
    expect(normalizeFormat('nope')).toBe(DEFAULT_FORMAT)
    expect(normalizeFormat(null)).toBe(DEFAULT_FORMAT)
  })
})
