import { describe, it, expect } from 'vitest'
import { isTopFour, selectDisplayDecks, type DeckRow } from './deckSelection'

function row(partial: Partial<DeckRow>): DeckRow {
  return {
    id: 1,
    sourceDeckId: '1',
    player: 'Player',
    placement: '1',
    eventName: 'Event',
    eventDate: '2026-06-01',
    archetypeName: 'Izzet Control',
    colorIdentity: 'UR',
    ...partial,
  }
}

describe('isTopFour', () => {
  it('treats 1st, 2nd, and Top 4 (3-4) as top finishes', () => {
    expect(isTopFour('1')).toBe(true)
    expect(isTopFour('2')).toBe(true)
    expect(isTopFour('3-4')).toBe(true)
    expect(isTopFour('4')).toBe(true)
  })

  it('treats worse-than-top-4 finishes as not top four', () => {
    expect(isTopFour('5-8')).toBe(false)
    expect(isTopFour('9-16')).toBe(false)
  })

  it('is false for empty or unparseable placements', () => {
    expect(isTopFour('')).toBe(false)
    expect(isTopFour('DNF')).toBe(false)
  })
})

describe('selectDisplayDecks', () => {
  it('shows only top-4 finishes when any exist', () => {
    const rows = [
      row({ sourceDeckId: 'a', placement: '5-8', eventDate: '2026-06-02' }),
      row({ sourceDeckId: 'b', placement: '3-4', eventDate: '2026-06-03' }),
      row({ sourceDeckId: 'c', placement: '1', eventDate: '2026-06-01' }),
      row({ sourceDeckId: 'd', placement: '9-16', eventDate: '2026-06-04' }),
    ]
    const result = selectDisplayDecks(rows)
    // Only the top-4 finishes (b, c), most recent first.
    expect(result.map((r) => r.sourceDeckId)).toEqual(['b', 'c'])
  })

  it('caps the top-4 branch at the 6 most recent finishes', () => {
    const rows = [
      row({ sourceDeckId: 't', placement: '1', eventDate: '2026-06-01' }),
      row({ sourceDeckId: 'u', placement: '2', eventDate: '2026-06-02' }),
      row({ sourceDeckId: 'v', placement: '1', eventDate: '2026-06-03' }),
      row({ sourceDeckId: 'w', placement: '3-4', eventDate: '2026-06-04' }),
      row({ sourceDeckId: 'x', placement: '1', eventDate: '2026-06-05' }),
      row({ sourceDeckId: 'y', placement: '2', eventDate: '2026-06-06' }),
      row({ sourceDeckId: 'z', placement: '1', eventDate: '2026-06-07' }),
    ]
    const result = selectDisplayDecks(rows)
    // Most recent six; the oldest (t) is dropped.
    expect(result.map((r) => r.sourceDeckId)).toEqual(['z', 'y', 'x', 'w', 'v', 'u'])
  })

  it('falls back to the latest 6 by event date when no top-4 finish exists', () => {
    const rows = [
      row({ sourceDeckId: 'a', placement: '5-8', eventDate: '2026-06-01' }),
      row({ sourceDeckId: 'b', placement: '5-8', eventDate: '2026-06-10' }),
      row({ sourceDeckId: 'c', placement: '9-16', eventDate: '2026-06-05' }),
      row({ sourceDeckId: 'd', placement: '5-8', eventDate: '2026-06-20' }),
      row({ sourceDeckId: 'e', placement: '9-16', eventDate: '2026-06-15' }),
      row({ sourceDeckId: 'f', placement: '5-8', eventDate: '2026-06-25' }),
      row({ sourceDeckId: 'g', placement: '9-16', eventDate: '2026-06-02' }),
    ]
    const result = selectDisplayDecks(rows)
    // Latest six by date, most recent first: f(25), d(20), e(15), b(10), c(05), g(02); a(01) dropped.
    expect(result.map((r) => r.sourceDeckId)).toEqual(['f', 'd', 'e', 'b', 'c', 'g'])
  })

  it('returns an empty list for no decks', () => {
    expect(selectDisplayDecks([])).toEqual([])
  })
})
