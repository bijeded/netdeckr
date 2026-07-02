import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Chainable query-builder mock resolving to { data, error }.
// decks -> select -> eq(format) -> gte(date) -> order(date desc) => result
const { from, eq, gte, order, queryResult } = vi.hoisted(() => {
  const queryResult = { data: null as unknown, error: null as unknown }
  const order = vi.fn(() => Promise.resolve(queryResult))
  const gte = vi.fn((..._args: unknown[]) => ({ order }))
  const eq = vi.fn(() => ({ gte }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, eq, gte, order, queryResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { from } }))

import { useDecks } from './useDecks'
import type { FormatCode } from '../lib/formats'
import type { WindowCode } from '../lib/windows'

function deckRow(over: Record<string, unknown> = {}) {
  return {
    source_deck_id: '1',
    player: 'Player',
    placement: '1',
    archetypes: { name: 'Izzet Control', color_identity: 'UR' },
    events: { name: 'RCQ', event_date: '2026-06-20' },
    ...over,
  }
}

describe('useDecks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('queries decks joined to events for the format within the window', async () => {
    queryResult.data = [deckRow()]
    const { result } = renderHook(() => useDecks('ST', '2weeks'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('decks')
    // Filters the embedded events by format and by date within the window.
    expect(eq).toHaveBeenCalledWith('events.format_code', 'ST')
    expect(gte).toHaveBeenCalledWith('events.event_date', expect.any(String))
    expect(order).toHaveBeenCalled()
  })

  it('groups decks by archetype and applies the top-4-else-latest-4 rule', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', placement: '1', archetypes: { name: 'Izzet Control', color_identity: 'UR' } }),
      deckRow({ source_deck_id: 'b', placement: '5-8', archetypes: { name: 'Izzet Control', color_identity: 'UR' } }),
      deckRow({ source_deck_id: 'c', placement: '9-16', archetypes: { name: 'Mono Red', color_identity: 'R' }, events: { name: 'MTGO', event_date: '2026-06-19' } }),
    ]
    const { result } = renderHook(() => useDecks('ST', '2months'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Izzet: only the top-4 deck shown; Mono Red: no top-4 so the deck is kept (latest-4 fallback).
    expect(result.current.decksByArchetype['Izzet Control'].map((d) => d.sourceDeckId)).toEqual(['a'])
    expect(result.current.decksByArchetype['Mono Red'].map((d) => d.sourceDeckId)).toEqual(['c'])
  })

  it('maps a deck row to camelCase fields', async () => {
    queryResult.data = [deckRow({ source_deck_id: 'z', player: 'Spike', placement: '3-4' })]
    const { result } = renderHook(() => useDecks('ST', '5days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deck = result.current.decksByArchetype['Izzet Control'][0]
    expect(deck).toEqual({
      sourceDeckId: 'z',
      player: 'Spike',
      placement: '3-4',
      eventName: 'RCQ',
      eventDate: '2026-06-20',
      archetypeName: 'Izzet Control',
      colorIdentity: 'UR',
    })
  })

  it('starts loading and exposes error + empty map on failure', async () => {
    queryResult.error = { message: 'boom' }
    const { result } = renderHook(() => useDecks('ST', '5days'))
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual({ message: 'boom' })
    expect(result.current.decksByArchetype).toEqual({})
  })

  it('re-queries when the format or window changes', async () => {
    queryResult.data = []
    const { rerender } = renderHook(({ f, w }: { f: FormatCode; w: WindowCode }) => useDecks(f, w), {
      initialProps: { f: 'ST', w: '5days' } as { f: FormatCode; w: WindowCode },
    })
    await waitFor(() => expect(from).toHaveBeenCalledTimes(1))
    rerender({ f: 'MO', w: '2weeks' })
    await waitFor(() => expect(from).toHaveBeenCalledTimes(2))
  })
})
