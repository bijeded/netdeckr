import { describe, it, expect } from 'vitest'
import { sizeClassOf, EVENT_SIZE_CLASSES } from './eventSize'

describe('sizeClassOf', () => {
  it('classifies each band at its exact boundaries', () => {
    // The boundaries are the whole contract — an off-by-one moves events between
    // bands silently, so both sides of every cut are pinned.
    expect(sizeClassOf(31)).toBe('small')
    expect(sizeClassOf(32)).toBe('medium')
    expect(sizeClassOf(95)).toBe('medium')
    expect(sizeClassOf(96)).toBe('large')
    expect(sizeClassOf(255)).toBe('large')
    expect(sizeClassOf(256)).toBe('massive')
  })

  it('treats an unreported size as its own class, not as small', () => {
    expect(sizeClassOf(null)).toBe('unsized')
    expect(sizeClassOf(null)).not.toBe('small')
  })

  it('treats a non-positive size as unreported', () => {
    expect(sizeClassOf(0)).toBe('unsized')
    expect(sizeClassOf(-1)).toBe('unsized')
  })

  it('classifies well inside each band', () => {
    expect(sizeClassOf(1)).toBe('small')
    expect(sizeClassOf(20)).toBe('small')
    expect(sizeClassOf(64)).toBe('medium')
    expect(sizeClassOf(128)).toBe('large')
    expect(sizeClassOf(1086)).toBe('massive')
  })

  it('offers every class exactly once, in filter order', () => {
    expect(EVENT_SIZE_CLASSES).toEqual(['small', 'medium', 'large', 'massive', 'unsized'])
    expect(new Set(EVENT_SIZE_CLASSES).size).toBe(EVENT_SIZE_CLASSES.length)
  })
})
