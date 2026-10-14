import { describe, it, expect } from 'vitest'
import { howItWorksEn } from './howItWorks.en'
import { howItWorksEs } from './howItWorks.es'
import type { Section } from './types'

/** Every list item on the page, as plain text. */
function listItems(sections: Section[]): string[] {
  return sections.flatMap((s) => (s.type === 'list' ? s.items : []))
}

describe('How It Works — trending table values', () => {
  it.each([
    ['en', howItWorksEn, ['Avg', 'Copies', 'Decks', 'Trend'], 'ranked by Copies', /set code|code of the set/i],
    ['es', howItWorksEs, ['Prom.', 'Copias', 'Mazos', 'Tend.'], 'ordenadas por Copias', /código del set/i],
  ] as const)('%s explains each column, the ranking, and no set code', (_, sections, columns, ranking, setCode) => {
    const items = listItems(sections)
    // Each column has its own bullet, named as the table header names it.
    for (const column of columns) {
      expect(items.some((item) => item.startsWith(`${column} — `))).toBe(true)
    }
    expect(items.some((item) => item.includes(ranking))).toBe(true)
    expect(items.some((item) => setCode.test(item))).toBe(false)
  })
})
