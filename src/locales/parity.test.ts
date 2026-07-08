import { describe, it, expect } from 'vitest'
import en from './en.json'
import es from './es.json'

/** All dot-paths of a nested translation object, sorted. */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([key, value]) => keyPaths(value, prefix ? `${prefix}.${key}` : key))
    .sort()
}

describe('locale parity', () => {
  it('en and es define exactly the same translation keys', () => {
    expect(keyPaths(es)).toEqual(keyPaths(en))
  })

  it('covers the decklist card-type group headings in both locales', () => {
    for (const locale of [en, es]) {
      const group = (locale as { modal: { group: Record<string, string> } }).modal.group
      for (const key of ['lands', 'creatures', 'spells', 'other']) {
        expect(group[key]).toBeTruthy()
      }
    }
  })

  it('covers the filter controls in both locales', () => {
    for (const locale of [en, es]) {
      const filters = (locale as { filters: Record<string, string> }).filters
      for (const key of ['event', 'allEvents', 'archetype', 'allArchetypes', 'clear', 'noResults']) {
        expect(filters[key]).toBeTruthy()
      }
    }
  })
})
