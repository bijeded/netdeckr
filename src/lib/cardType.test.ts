import { describe, expect, it } from 'vitest'
import { cardCategory, groupMainByType, type CardTypeCategory } from './cardType'

describe('cardCategory', () => {
  it('classifies lands', () => {
    expect(cardCategory('Basic Land — Forest')).toBe('lands')
    expect(cardCategory('Land')).toBe('lands')
    expect(cardCategory('Artifact Land')).toBe('lands')
  })

  it('classifies a Land Creature as a land (Land precedence)', () => {
    expect(cardCategory('Land Creature — Dryad')).toBe('lands')
  })

  it('classifies creatures', () => {
    expect(cardCategory('Creature — Elf Druid')).toBe('creatures')
    expect(cardCategory('Legendary Creature — Human Wizard')).toBe('creatures')
  })

  it('classifies non-land creature hybrids as creatures', () => {
    expect(cardCategory('Artifact Creature — Golem')).toBe('creatures')
    expect(cardCategory('Enchantment Creature — Gorgon')).toBe('creatures')
  })

  it('classifies instants, sorceries, and enchantments as spells', () => {
    expect(cardCategory('Instant')).toBe('spells')
    expect(cardCategory('Sorcery')).toBe('spells')
    expect(cardCategory('Enchantment — Aura')).toBe('spells')
  })

  it('classifies artifacts, planeswalkers, and battles as other', () => {
    expect(cardCategory('Artifact')).toBe('other')
    expect(cardCategory('Legendary Planeswalker — Jace')).toBe('other')
    expect(cardCategory('Battle — Siege')).toBe('other')
  })

  it('classifies a multi-face card by the single face the deck plays', () => {
    // The scraper stores one face's line, never the combined "<front> // <back>"
    // string, so a sorcery whose other face is a creature is a spell and a modal
    // DFC played as a sorcery is a spell rather than a land.
    expect(cardCategory('Sorcery')).toBe('spells') // Esper Origins (back: Saga creature)
    expect(cardCategory('Sorcery — Arcane')).toBe('spells') // Agadeem's Awakening (back: Land)
    expect(cardCategory('Creature — Fox Advisor')).toBe('creatures') // Eiganjo Dynastorian (back: Sorcery)
  })

  it('classifies missing or empty type lines as other', () => {
    expect(cardCategory(null)).toBe('other')
    expect(cardCategory('')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(cardCategory('creature — goblin')).toBe('creatures')
    expect(cardCategory('BASIC LAND')).toBe('lands')
  })
})

describe('groupMainByType', () => {
  const line = (name: string, typeLine: string | null) => ({ quantity: 1, name, typeLine })

  it('buckets lines into the four categories', () => {
    const grouped = groupMainByType([
      line('Forest', 'Basic Land — Forest'),
      line('Llanowar Elves', 'Creature — Elf Druid'),
      line('Opt', 'Instant'),
      line('The Wandering Emperor', 'Legendary Planeswalker'),
    ])
    expect(grouped.lands.map((l) => l.name)).toEqual(['Forest'])
    expect(grouped.creatures.map((l) => l.name)).toEqual(['Llanowar Elves'])
    expect(grouped.spells.map((l) => l.name)).toEqual(['Opt'])
    expect(grouped.other.map((l) => l.name)).toEqual(['The Wandering Emperor'])
  })

  it('preserves input order within a bucket', () => {
    const grouped = groupMainByType([
      line('B', 'Creature — B'),
      line('A', 'Creature — A'),
    ])
    expect(grouped.creatures.map((l) => l.name)).toEqual(['B', 'A'])
  })

  it('places unresolved type lines into other', () => {
    const grouped = groupMainByType([line('Embiggen', null)])
    expect(grouped.other.map((l) => l.name)).toEqual(['Embiggen'])
  })

  it('exposes the categories in fixed order', () => {
    const order: CardTypeCategory[] = ['lands', 'creatures', 'spells', 'other']
    expect(Object.keys(groupMainByType([]))).toEqual(order)
  })
})
