import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// supabase.rpc('top_cards', params) -> thenable {data,error}, called once per
// board, plus one supabase.rpc('recent_set_top_cards', params) for Top New Cards
// (outside Pre-Modern). supabase.from('archetypes')... resolves names -> ids.
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

/** A raw recent_set_top_cards row. */
function n(card_name: string, total_copies: number, deck_count = 1, set_code = 'FRA') {
  return { card_name, total_copies, deck_count, image_url: null, set_code }
}

/** Route each rpc call to canned data by function, then board. */
function routeRpc(map: { main?: unknown[]; side?: unknown[]; recent?: unknown[] }) {
  rpc.mockImplementation((fn: string, params: Record<string, unknown>) => {
    if (fn === 'recent_set_top_cards') return Promise.resolve({ data: map.recent ?? [], error: null })
    return Promise.resolve({ data: params.p_board === 'side' ? (map.side ?? []) : (map.main ?? []), error: null })
  })
}

const callsTo = (fn: string) => rpc.mock.calls.filter((c) => c[0] === fn)

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

    // one call per board plus the Top New Cards call — no preceding-window call
    expect(rpc).toHaveBeenCalledTimes(3)
    expect(result.current.creatures.map((c) => c.cardName)).toEqual(['Goblin', 'Bear'])
    expect(result.current.creatures[0]).toMatchObject({ totalCopies: 60, avgCopies: 2 })
    expect(result.current.spells.map((c) => c.cardName)).toEqual(['Bolt'])
    expect(result.current.sideboard.map((c) => c.cardName)).toEqual(['S1', 'S2'])
    expect(result.current.sideboard[0]).toMatchObject({ totalCopies: 10 })
  })

  it('passes the selected format and both boards to the RPC', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
    const boards = callsTo('top_cards').map((c) => c[1].p_board)
    expect(boards).toEqual(expect.arrayContaining(['main', 'side']))
    expect(rpc.mock.calls.every((c) => c[1].p_format === 'MO')).toBe(true)
  })

  it('passes the event id to both calls when an event filter is active', async () => {
    routeRpc({ main: [r('A', 10, 9)], side: [r('S1', 3)] })
    const { result } = renderHook(() => useTrendingCards('ST', '7days', { eventId: 42 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc.mock.calls.every((c) => c[1].p_event_id === 42)).toBe(true)
  })

  it('sends no event-id restriction when no size class is selected', async () => {
    routeRpc({ main: [r('A', 10, 9)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
    expect(rpc.mock.calls.every((c) => c[1].p_event_ids == null)).toBe(true)
  })

  it('passes the size class’s event ids to both calls', async () => {
    routeRpc({ main: [r('A', 10, 9)], side: [r('S1', 3)] })
    const { result } = renderHook(() =>
      useTrendingCards('ST', '7days', { eventIds: [1, 2, 3] }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc.mock.calls.every((c) => {
      const ids = c[1].p_event_ids
      return Array.isArray(ids) && ids.join() === '1,2,3'
    })).toBe(true)
  })

  it('sends an empty id set rather than dropping the filter when a size class matches nothing', async () => {
    routeRpc({ main: [], side: [] })
    const { result } = renderHook(() => useTrendingCards('ST', '7days', { eventIds: [] }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // The distinction that matters: [] restricts to nothing, null restricts to
    // nothing *at all*. Collapsing [] to null would show every event's cards
    // under a size class that matched no event.
    expect(rpc.mock.calls.every((c) => Array.isArray(c[1].p_event_ids) && c[1].p_event_ids.length === 0)).toBe(true)
    expect(result.current.creatures).toEqual([])
    expect(result.current.spells).toEqual([])
  })

  it('combines the size id set with a single-event filter', async () => {
    routeRpc({ main: [r('A', 10, 9)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days', { eventId: 2, eventIds: [1, 2, 3] }))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
    expect(rpc.mock.calls.every((c) => c[1].p_event_id === 2 && c[1].p_event_ids.length === 3)).toBe(true)
  })

  it('does not refetch when the event id array keeps the same contents', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    const { rerender } = renderHook(({ ids }: { ids: number[] }) =>
      useTrendingCards('ST', '7days', { eventIds: ids }),
      { initialProps: { ids: [1, 2] } },
    )
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))

    // A fresh array with identical contents must not re-run the effect — App
    // rebuilds this list from `events` on every render.
    rerender({ ids: [1, 2] })
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
  })

  it('resolves selected archetype names to ids and passes them to the RPC', async () => {
    archResult.data = [{ id: 7, name: 'Izzet Prowess' }, { id: 9, name: 'Mono Red' }]
    routeRpc({ main: [r('A', 5, 4)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days', { archetypeNames: ['Izzet Prowess', 'Mono Red'] }))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))

    expect(from).toHaveBeenCalledWith('archetypes')
    expect(rpc.mock.calls.every((c) => {
      const ids = c[1].p_archetype_ids
      return Array.isArray(ids) && ids.includes(7) && ids.includes(9)
    })).toBe(true)
  })

  it('does not resolve archetypes when no archetype filter is set', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(3))
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
    expect(result.current.newCards).toEqual([])
  })

  it('confines a Top New Cards failure to that table', async () => {
    rpc.mockImplementation((fn: string, params: Record<string, unknown>) => {
      if (fn === 'recent_set_top_cards') return Promise.resolve({ data: null, error: { message: 'no such function' } })
      const data = params.p_board === 'side' ? [r('S1', 3)] : [r('Goblin', 8, 2, 'creature'), r('Bolt', 6, 2)]
      return Promise.resolve({ data, error: null })
    })
    const { result } = renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.newCardsError).toEqual({ message: 'no such function' })
    expect(result.current.newCards).toEqual([])
    expect(result.current.creatures.map((c) => c.cardName)).toEqual(['Goblin'])
    expect(result.current.spells.map((c) => c.cardName)).toEqual(['Bolt'])
    expect(result.current.sideboard.map((c) => c.cardName)).toEqual(['S1'])
  })

  it('ranks the recent-set cards into Top New Cards with their set codes', async () => {
    routeRpc({ recent: [n('Ring', 8, 4, 'HOB'), n('Bolt', 12, 5), n('Dual', 8, 6, 'HOB')] })
    const { result } = renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // copies desc, then deck count desc
    expect(result.current.newCards.map((c) => [c.cardName, c.setCode])).toEqual([
      ['Bolt', 'FRA'],
      ['Dual', 'HOB'],
      ['Ring', 'HOB'],
    ])
    expect(result.current.newCards[0]).toMatchObject({ totalCopies: 12 })
  })

  it('caps Top New Cards at 10', async () => {
    routeRpc({ recent: Array.from({ length: 14 }, (_, i) => n(`C${i}`, 100 - i)) })
    const { result } = renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.newCards).toHaveLength(10)
  })

  it('sends the Top New Cards call the same slice as the board calls, with no board', async () => {
    archResult.data = [{ id: 7, name: 'Izzet Prowess' }]
    routeRpc({})
    const { result } = renderHook(() =>
      useTrendingCards('PI', '2weeks', { archetypeNames: ['Izzet Prowess'], eventId: 4, eventIds: [4, 5] }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    const [recentCall] = callsTo('recent_set_top_cards')
    const [mainCall] = callsTo('top_cards')
    const { p_board, ...slice } = mainCall[1]
    expect(p_board).toBe('main')
    expect(recentCall[1]).toEqual(slice)
    expect(recentCall[1]).toMatchObject({ p_format: 'PI', p_archetype_ids: [7], p_event_id: 4, p_event_ids: [4, 5] })
  })

  it('makes no Top New Cards call in Pre-Modern', async () => {
    routeRpc({ main: [r('A', 1)], recent: [n('Never', 99)] })
    const { result } = renderHook(() => useTrendingCards('PREM', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(callsTo('recent_set_top_cards')).toHaveLength(0)
    expect(callsTo('top_cards')).toHaveLength(2)
    expect(result.current.newCards).toEqual([])
    expect(result.current.creatures.length + result.current.spells.length).toBe(1)
  })
})
