import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// supabase.rpc('top_cards', params) -> thenable {data,error}, called once per
// board. supabase.from('archetypes')... resolves selected names -> ids.
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

/** A raw RPC row (now carries a creature/spell category). */
function r(
  card_name: string,
  total_copies: number,
  deck_count = 1,
  category: 'creature' | 'spell' = 'spell',
  image_url: string | null = null,
) {
  return { card_name, total_copies, deck_count, category, image_url }
}

/** Route each rpc call to canned data by board. */
function routeRpc(map: { main?: unknown[]; side?: unknown[] }) {
  rpc.mockImplementation((_fn: string, params: Record<string, unknown>) =>
    Promise.resolve({ data: params.p_board === 'side' ? (map.side ?? []) : (map.main ?? []), error: null }),
  )
}

describe('useTrendingCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    archResult.data = null
    archResult.error = null
  })

  it('splits the mainboard into creatures and spells and ranks the sideboard', async () => {
    routeRpc({
      main: [r('Goblin', 60, 30, 'creature'), r('Bolt', 40, 20, 'spell'), r('Bear', 12, 6, 'creature')],
      side: [r('S1', 10, 8), r('S2', 5, 4)],
    })
    const { result } = renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // one call per board — no preceding-window call
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(result.current.creatures.map((c) => c.cardName)).toEqual(['Goblin', 'Bear'])
    expect(result.current.creatures[0]).toMatchObject({ totalCopies: 60, avgCopies: 2 })
    expect(result.current.spells.map((c) => c.cardName)).toEqual(['Bolt'])
    expect(result.current.sideboard.map((c) => c.cardName)).toEqual(['S1', 'S2'])
    expect(result.current.sideboard[0]).toMatchObject({ totalCopies: 10 })
  })

  it('passes the selected format and both boards to the RPC', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
    const boards = rpc.mock.calls.map((c) => c[1].p_board)
    expect(boards).toEqual(expect.arrayContaining(['main', 'side']))
    expect(rpc.mock.calls.every((c) => c[1].p_format === 'MO')).toBe(true)
  })

  it('passes the event id to both calls when an event filter is active', async () => {
    routeRpc({ main: [r('A', 10, 9)], side: [r('S1', 3)] })
    const { result } = renderHook(() => useTrendingCards('ST', '7days', { eventId: 42 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc.mock.calls.every((c) => c[1].p_event_id === 42)).toBe(true)
  })

  it('resolves selected archetype names to ids and passes them to the RPC', async () => {
    archResult.data = [{ id: 7, name: 'Izzet Prowess' }, { id: 9, name: 'Mono Red' }]
    routeRpc({ main: [r('A', 5, 4)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days', { archetypeNames: ['Izzet Prowess', 'Mono Red'] }))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))

    expect(from).toHaveBeenCalledWith('archetypes')
    expect(rpc.mock.calls.every((c) => {
      const ids = c[1].p_archetype_ids
      return Array.isArray(ids) && ids.includes(7) && ids.includes(9)
    })).toBe(true)
  })

  it('does not resolve archetypes when no archetype filter is set', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
    expect(from).not.toHaveBeenCalled()
    expect(rpc.mock.calls.every((c) => c[1].p_archetype_ids == null)).toBe(true)
  })

  it('exposes an error and empty tables on RPC failure', async () => {
    rpc.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'boom' } }))
    const { result } = renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual({ message: 'boom' })
    expect(result.current.creatures).toEqual([])
    expect(result.current.spells).toEqual([])
    expect(result.current.sideboard).toEqual([])
  })
})
