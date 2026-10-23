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

/** The Analysis tab section: the paragraph and list that follow its heading. */
function analysisSection(sections: Section[], heading: string): { intro: string; items: string[] } {
  const start = sections.findIndex((s) => s.type === 'heading' && s.text === heading)
  const intro = sections[start + 1]
  const list = sections[start + 2]
  return {
    intro: intro?.type === 'paragraph' ? intro.text.filter((part) => typeof part === 'string').join('') : '',
    items: list?.type === 'list' ? list.items : [],
  }
}

describe('How It Works — Analysis tab', () => {
  it.each([
    [
      'en',
      howItWorksEn,
      'The Analysis tab',
      /last 2 weeks/,
      {
        stock: 'Stock list',
        power: 'Power Score',
        figures: 'Share, Tier, Top 8 rate, Wins, Decks',
        types: 'Card types',
        wildcards: 'Arena wildcards',
        small: 'Small sample',
      },
    ],
    [
      'es',
      howItWorksEs,
      'La pestaña Análisis',
      /últimas 2 semanas/,
      {
        stock: 'Lista base',
        power: 'Power Score',
        figures: 'Cuota, Tier, Tasa de Top 8, Victorias, Listas',
        types: 'Tipos de carta',
        wildcards: 'Comodines de Arena',
        small: 'Muestra pequeña',
      },
    ],
  ] as const)('%s explains the fixed scope and each part by its on-screen name', (_, sections, heading, scope, parts) => {
    const { intro, items } = analysisSection(sections, heading)
    expect(intro).toMatch(scope)
    // One bullet per part, in the tab's order, each named as the tab labels it.
    expect(items.map((item) => item.split(' — ')[0])).toEqual(Object.values(parts))

    const entry = (name: string) => items.find((item) => item.startsWith(`${name} — `)) ?? ''
    // The consensus table, its bands, and the sideboard plan are gone from the tab.
    expect(items.join(' ')).not.toMatch(/\b(Core|Núcleo|Spicy|Picante|Consensus|Consenso)\b|sideboard plan|plan de sideboard/i)
    expect(entry(parts.wildcards)).toMatch(/Standard/)
    expect(entry(parts.wildcards)).toMatch(/Pioneer/)
    expect(entry(parts.small)).toMatch(/\b5\b/)
  })
})
