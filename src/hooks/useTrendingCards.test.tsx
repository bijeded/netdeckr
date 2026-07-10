import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// supabase.rpc('top_cards', params) -> thenable {data,error}, called once per
// window/board. supabase.from('archetypes')... resolves selected names -> ids.
const { rpc, from, archResult } = vi.hoisted(() => {
  const rpc = vi.fn()
  const archResult = { data: null as unknown, error: null as unknown }
  const inFn = vi.fn(() => Promise.resolve(archResult))
  const eq = vi.fn(() => ({ in: inFn }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { rpc, from, archResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { rpc, from } }))

import { useTrendingCards } from './useTrendingCards'

/** A raw RPC row. */
function r(card_name: string, total_copies: number, deck_count = 1, image_url: string | null = null) {
  return { card_name, total_copies, deck_count, image_url }
}

/** Route each rpc call to canned data by board + whether it's the preceding window. */
function routeRpc(map: {
  mainCurrent?: unknown[]
  mainPrev?: unknown[]
  side?: unknown[]
}) {
  rpc.mockImplementation((_fn: string, params: Record<string, unknown>) => {
    const isSide = params.p_board === 'side'
    // The preceding call is the mainboard call whose window ends at the selected start.
    const selectedStart = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    const isPrev = !isSide && params.p_end <= selectedStart
    let data: unknown[] = []
    if (isSide) data = map.side ?? []
    else if (isPrev) data = map.mainPrev ?? []
    else data = map.mainCurrent ?? []
    return Promise.resolve({ data, error: null })
  })
}

describe('useTrendingCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    archResult.data = null
    archResult.error = null
  })

  it('ranks the mainboard by copy share with a period delta and a share-only sideboard', async () => {
    routeRpc({
      mainCurrent: [r('A', 60, 30), r('B', 40, 20)],
      mainPrev: [r('A', 40, 20), r('B', 60, 25)],
      side: [r('S1', 10, 8), r('S2', 5, 4)],
    })
    const { result } = renderHook(() => useTrendingCards('ST', '5days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(rpc).toHaveBeenCalledTimes(3)
    expect(result.current.trending.map((c) => c.cardName)).toEqual(['A', 'B'])
    expect(result.current.trending[0]).toMatchObject({ sharePct: 60 })
    expect(result.current.trending[0].delta).toMatchObject({ direction: 'up', valuePct: 20 })
    // sideboard has no delta
    expect(result.current.sideboard.map((c) => c.cardName)).toEqual(['S1', 'S2'])
    expect(result.current.sideboard.every((c) => c.delta === null)).toBe(true)
  })

  it('passes the selected format and both boards to the RPC', async () => {
    routeRpc({ mainCurrent: [r('A', 1)], mainPrev: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
    const boards = rpc.mock.calls.map((c) => c[1].p_board)
    expect(boards).toContain('main')
    expect(boards).toContain('side')
    expect(rpc.mock.calls.every((c) => c[1].p_format === 'MO')).toBe(true)
  })

  it('suppresses the delta and skips the preceding call when an event filter is active', async () => {
    routeRpc({ mainCurrent: [r('A', 10, 9)], side: [r('S1', 3)] })
    const { result } = renderHook(() => useTrendingCards('ST', '5days', { eventId: 42 }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // only main-current + side-current (no preceding window under an event filter)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls.every((c) => c[1].p_event_id === 42 || c[1].p_board === undefined)).toBe(true)
    expect(result.current.trending.every((c) => c.delta === null)).toBe(true)
  })

  it('resolves selected archetype names to ids and passes them to the RPC', async () => {
    archResult.data = [{ id: 7, name: 'Izzet Prowess' }, { id: 9, name: 'Mono Red' }]
    routeRpc({ mainCurrent: [r('A', 5, 4)], mainPrev: [r('A', 5, 4)], side: [] })
    renderHook(() => useTrendingCards('ST', '5days', { archetypeNames: ['Izzet Prowess', 'Mono Red'] }))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))

    expect(from).toHaveBeenCalledWith('archetypes')
    expect(rpc.mock.calls.every((c) => {
      const ids = c[1].p_archetype_ids
      return Array.isArray(ids) && ids.includes(7) && ids.includes(9)
    })).toBe(true)
  })

  it('does not resolve archetypes when no archetype filter is set', async () => {
    routeRpc({ mainCurrent: [r('A', 1)], mainPrev: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('ST', '5days'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
    expect(from).not.toHaveBeenCalled()
    expect(rpc.mock.calls.every((c) => c[1].p_archetype_ids == null)).toBe(true)
  })

  it('suppresses the delta when the preceding window is too thin', async () => {
    // preceding top card is in only 2 decks -> below MIN_PREV_DECKS
    routeRpc({
      mainCurrent: [r('A', 60, 30), r('B', 40, 20)],
      mainPrev: [r('A', 5, 2), r('B', 3, 1)],
      side: [],
    })
    const { result } = renderHook(() => useTrendingCards('ST', '5days'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.trending.every((c) => c.delta === null)).toBe(true)
  })

  it('exposes an error and empty tables on RPC failure', async () => {
    rpc.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'boom' } }))
    const { result } = renderHook(() => useTrendingCards('ST', '5days'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual({ message: 'boom' })
    expect(result.current.trending).toEqual([])
    expect(result.current.sideboard).toEqual([])
  })
})
