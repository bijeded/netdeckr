import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Chainable query-builder mock resolving to { data, error }.
// decks -> select -> eq(format) -> gte(date) -> order(date desc) => result
const { from, eq, gte, queryResult } = vi.hoisted(() => {
  const queryResult = { data: null as unknown, error: null as unknown }
  const order = vi.fn(() => Promise.resolve(queryResult))
  const gte = vi.fn((..._args: unknown[]) => ({ order }))
  const eq = vi.fn(() => ({ gte }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, eq, gte, queryResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { from } }))

import { useMetagame } from './useMetagame'

function deckRow(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    source_deck_id: '1',
    player: 'Player',
    placement: '1',
    archetypes: { name: 'Izzet Lesson', color_identity: 'UR', art_image_url: null, art_crop_url: null },
    events: { name: 'RCQ', event_date: '2026-06-20' },
    ...over,
  }
}

describe('useMetagame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('fetches the window decks and derives both the breakdown and the display decks', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', placement: '1' }),
      deckRow({ source_deck_id: 'b', placement: '3-4' }),
      deckRow({
        source_deck_id: 'c',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { name: 'MTGO', event_date: '2026-06-19' },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('decks')
    expect(eq).toHaveBeenCalledWith('events.format_code', 'ST')
    expect(gte).toHaveBeenCalledWith('events.event_date', expect.any(String))

    // Breakdown derived from deck counts: Izzet Lesson 2/3, Mono Red 1/3.
    expect(result.current.breakdown.map((a) => a.name)).toEqual(['Izzet Lesson', 'Mono Red'])
    expect(result.current.breakdown[0].sharePct).toBeCloseTo(66.67, 1)
    expect(result.current.breakdown[0].rank).toBe(1)

    // Same rows drive the drill-down decks.
    expect(result.current.decksByArchetype['Izzet Lesson'].map((d) => d.sourceDeckId)).toEqual(['a', 'b'])
    expect(result.current.decksByArchetype['Mono Red'].map((d) => d.sourceDeckId)).toEqual(['c'])
  })

  it('returns an empty breakdown and map when there are no decks', async () => {
    queryResult.data = []
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.breakdown).toEqual([])
    expect(result.current.decksByArchetype).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('surfaces a query error and clears data', async () => {
    queryResult.error = { message: 'boom' }
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.breakdown).toEqual([])
    expect(result.current.decksByArchetype).toEqual({})
  })
})
