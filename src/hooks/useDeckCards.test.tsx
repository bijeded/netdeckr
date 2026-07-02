import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// deck_cards -> select -> eq(deck_id) -> order(id) => { data, error }
const { from, eq, queryResult } = vi.hoisted(() => {
  const queryResult = { data: null as unknown, error: null as unknown }
  const order = vi.fn(() => Promise.resolve(queryResult))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, eq, queryResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { from } }))

import { useDeckCards } from './useDeckCards'

describe('useDeckCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('does not query when deckId is null and reports not loading', () => {
    const { result } = renderHook(() => useDeckCards(null))
    expect(from).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    expect(result.current.main).toEqual([])
    expect(result.current.side).toEqual([])
  })

  it('queries deck_cards for the deck id and splits main/side', async () => {
    queryResult.data = [
      { board: 'main', quantity: 4, card_name: 'Llanowar Elves' },
      { board: 'side', quantity: 2, card_name: 'Duress' },
      { board: 'main', quantity: 6, card_name: 'Forest' },
    ]
    const { result } = renderHook(() => useDeckCards(7))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('deck_cards')
    expect(eq).toHaveBeenCalledWith('deck_id', 7)
    expect(result.current.main).toEqual([
      { quantity: 4, name: 'Llanowar Elves' },
      { quantity: 6, name: 'Forest' },
    ])
    expect(result.current.side).toEqual([{ quantity: 2, name: 'Duress' }])
    expect(result.current.mainCount).toBe(10)
    expect(result.current.sideCount).toBe(2)
  })

  it('prefers the Scryfall canonical name when present', async () => {
    queryResult.data = [
      { board: 'main', quantity: 1, card_name: 'Lightning Bolt', scryfall_name: 'Lightning Bolt (canonical)' },
    ]
    const { result } = renderHook(() => useDeckCards(7))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.main[0].name).toBe('Lightning Bolt (canonical)')
  })

  it('exposes an error and empty lists on failure', async () => {
    queryResult.error = { message: 'boom' }
    const { result } = renderHook(() => useDeckCards(7))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual({ message: 'boom' })
    expect(result.current.main).toEqual([])
    expect(result.current.side).toEqual([])
  })

  it('re-queries when the deck id changes', async () => {
    queryResult.data = []
    const { rerender } = renderHook(({ id }: { id: number | null }) => useDeckCards(id), {
      initialProps: { id: 7 as number | null },
    })
    await waitFor(() => expect(from).toHaveBeenCalledTimes(1))
    rerender({ id: 8 })
    await waitFor(() => expect(from).toHaveBeenCalledTimes(2))
  })
})
