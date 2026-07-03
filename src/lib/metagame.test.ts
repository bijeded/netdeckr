import { describe, it, expect } from 'vitest'
import { deriveBreakdown, type DeckForBreakdown } from './metagame'

function d(archetypeName: string, over: Partial<DeckForBreakdown> = {}): DeckForBreakdown {
  return { archetypeName, colorIdentity: '', artImageUrl: null, artCropUrl: null, ...over }
}

describe('deriveBreakdown', () => {
  it('counts decks per archetype and computes share as count / total', () => {
    const b = deriveBreakdown([
      d('Izzet Lesson', { colorIdentity: 'UR' }),
      d('Izzet Lesson', { colorIdentity: 'UR' }),
      d('Mono Red', { colorIdentity: 'R' }),
    ])
    expect(b.map((x) => x.name)).toEqual(['Izzet Lesson', 'Mono Red'])
    expect(b.map((x) => x.rank)).toEqual([1, 2])
    expect(b[0].sharePct).toBeCloseTo(66.67, 1)
    expect(b[1].sharePct).toBeCloseTo(33.33, 1)
    expect(b[0].colorIdentity).toBe('UR')
  })

  it('ranks by deck count descending, then name ascending for ties', () => {
    const b = deriveBreakdown([d('Beta'), d('Beta'), d('Alpha'), d('Alpha'), d('Gamma')])
    // Alpha and Beta tie at 2 decks -> Alpha first (name asc); Gamma has 1.
    expect(b.map((x) => x.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(b.map((x) => x.rank)).toEqual([1, 2, 3])
  })

  it('carries the archetype art onto the share', () => {
    const b = deriveBreakdown([
      d('X', { artImageUrl: 'https://img/x.jpg', artCropUrl: 'https://crop/x.jpg' }),
    ])
    expect(b[0].artImageUrl).toBe('https://img/x.jpg')
    expect(b[0].artCropUrl).toBe('https://crop/x.jpg')
  })

  it('caps at the top 20 archetypes by share', () => {
    const decks: DeckForBreakdown[] = []
    for (let i = 0; i < 25; i++) {
      const name = `A${String(i).padStart(2, '0')}`
      for (let j = 0; j <= i; j++) decks.push(d(name)) // A24 has the most decks
    }
    const b = deriveBreakdown(decks)
    expect(b).toHaveLength(20)
    expect(b[0].name).toBe('A24')
  })

  it('ignores decks with no archetype name', () => {
    const b = deriveBreakdown([d('Real'), d('')])
    expect(b.map((x) => x.name)).toEqual(['Real'])
    expect(b[0].sharePct).toBeCloseTo(100, 1)
  })

  it('returns an empty breakdown for no decks', () => {
    expect(deriveBreakdown([])).toEqual([])
  })
})
