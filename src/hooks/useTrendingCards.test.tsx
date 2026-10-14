import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// supabase.rpc('top_cards', params) -> thenable {data,error}, called once per
// board, plus one supabase.rpc('recent_set_top_cards', params) for Top New Cards
// (outside Pre-Modern) — each repeated over the preceding window for the trend
// (skipped under an event filter). supabase.from('archetypes')... resolves names -> ids.
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

const { captureError } = vi.hoisted(() => ({ captureError: vi.fn() }))
vi.mock('../lib/sentry', () => ({ captureError }))

import { useTrendingCards } from './useTrendingCards'
import { precedingWindowStartISO, windowStartISO } from '../lib/windows'

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
function n(card_name: string, total_copies: number, deck_count = 1) {
  return { card_name, total_copies, deck_count, image_url: null, set_code: 'FRA' }
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

    // one call per board plus the Top New Cards call, each for both windows
    expect(rpc).toHaveBeenCalledTimes(6)
    expect(result.current.creatures.map((c) => c.cardName)).toEqual(['Goblin', 'Bear'])
    expect(result.current.creatures[0]).toMatchObject({ totalCopies: 60, avgCopies: 2 })
    expect(result.current.spells.map((c) => c.cardName)).toEqual(['Bolt'])
    expect(result.current.sideboard.map((c) => c.cardName)).toEqual(['S1', 'S2'])
    expect(result.current.sideboard[0]).toMatchObject({ totalCopies: 10 })
  })

  it('passes the selected format and both boards to the RPC', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))
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
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))
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
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))

    // A fresh array with identical contents must not re-run the effect — App
    // rebuilds this list from `events` on every render.
    rerender({ ids: [1, 2] })
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))
  })

  it('resolves selected archetype names to ids and passes them to the RPC', async () => {
    archResult.data = [{ id: 7, name: 'Izzet Prowess' }, { id: 9, name: 'Mono Red' }]
    routeRpc({ main: [r('A', 5, 4)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days', { archetypeNames: ['Izzet Prowess', 'Mono Red'] }))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))

    expect(from).toHaveBeenCalledWith('archetypes')
    expect(rpc.mock.calls.every((c) => {
      const ids = c[1].p_archetype_ids
      return Array.isArray(ids) && ids.includes(7) && ids.includes(9)
    })).toBe(true)
  })

  it('does not resolve archetypes when no archetype filter is set', async () => {
    routeRpc({ main: [r('A', 1)], side: [] })
    renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(6))
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

  it('reports a failed main/side load once', async () => {
    const boom = { code: '57014', message: 'canceling statement due to statement timeout' }
    rpc.mockImplementation((fn: string, params: Record<string, unknown>) =>
      fn === 'top_cards' && params.p_start === windowStartISO('7days')
        ? Promise.resolve({ data: null, error: boom })
        : Promise.resolve({ data: [], error: null }),
    )
    const { result } = renderHook(() => useTrendingCards('MO', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toEqual(boom)
    expect(captureError).toHaveBeenCalledTimes(1)
    expect(captureError).toHaveBeenCalledWith(boom, {
      tags: { feature: 'trending', rpc: 'top_cards', slice: 'selected', format: 'MO', window: '7days' },
    })
  })

  it('reports nothing on a successful load', async () => {
    routeRpc({ main: [r('A', 1)], side: [r('S', 1)], recent: [n('N', 1)] })
    const { result } = renderHook(() => useTrendingCards('MO', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(captureError).not.toHaveBeenCalled()
  })

  it('reports a failed preceding-window call without changing the tables', async () => {
    const prevStart = precedingWindowStartISO('7days')
    rpc.mockImplementation((fn: string, params: Record<string, unknown>) =>
      fn === 'recent_set_top_cards' && params.p_start === prevStart
        ? Promise.resolve({ data: null, error: { message: 'prev boom' } })
        : Promise.resolve({ data: params.p_board === 'side' ? [] : [r('Bolt', 4)], error: null }),
    )
    const { result } = renderHook(() => useTrendingCards('PAU', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.newCardsError).toBeNull()
    expect(result.current.spells.map((c) => c.cardName)).toEqual(['Bolt'])
    expect(captureError).toHaveBeenCalledTimes(1)
    expect(captureError).toHaveBeenCalledWith(
      { message: 'prev boom' },
      { tags: { feature: 'trending', rpc: 'recent_set_top_cards', slice: 'preceding', format: 'PAU', window: '7days' } },
    )
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
    // Selected and preceding Top New Cards calls both fail here: one report each.
    const newCardsReports = captureError.mock.calls.filter((c) => c[1].tags.rpc === 'recent_set_top_cards')
    expect(newCardsReports.map((c) => c[1].tags.slice).sort()).toEqual(['preceding', 'selected'])
    expect(captureError).toHaveBeenCalledTimes(2)
  })

  it('ranks the recent-set cards into Top New Cards, without set codes', async () => {
    routeRpc({ recent: [n('Ring', 8, 4), n('Bolt', 12, 5), n('Dual', 8, 6)] })
    const { result } = renderHook(() => useTrendingCards('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // copies desc, then deck count desc
    expect(result.current.newCards.map((c) => c.cardName)).toEqual(['Bolt', 'Dual', 'Ring'])
    expect(result.current.newCards[0]).toMatchObject({ totalCopies: 12, avgCopies: 2 })
    expect(result.current.newCards[0]).not.toHaveProperty('setCode')
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
    expect(callsTo('top_cards')).toHaveLength(4)
    expect(result.current.newCards).toEqual([])
    expect(result.current.creatures.length + result.current.spells.length).toBe(1)
  })

  describe('play rate and trend', () => {
    /** Route by window: rows for the selected window vs the preceding one. */
    function routeWindows(prevStart: string, sel: { main?: unknown[]; side?: unknown[]; recent?: unknown[] }, prev: { main?: unknown[]; side?: unknown[]; recent?: unknown[] } | 'fail') {
      rpc.mockImplementation((fn: string, params: Record<string, unknown>) => {
        const isPrev = params.p_start === prevStart
        if (isPrev && prev === 'fail') return Promise.resolve({ data: null, error: { message: 'prev boom' } })
        const map = isPrev ? (prev as typeof sel) : sel
        if (fn === 'recent_set_top_cards') return Promise.resolve({ data: map.recent ?? [], error: null })
        return Promise.resolve({ data: params.p_board === 'side' ? (map.side ?? []) : (map.main ?? []), error: null })
      })
    }

    it('fetches each table again over the preceding equal-length window', async () => {
      routeRpc({})
      const { result } = renderHook(() => useTrendingCards('ST', '2weeks'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      const prevStart = precedingWindowStartISO('2weeks')
      const selStart = windowStartISO('2weeks')
      const prevCalls = rpc.mock.calls.filter((c) => c[1].p_start === prevStart)
      expect(prevCalls).toHaveLength(3)
      // Half-open [now−2N, now−N): it ends exactly where the selected window starts.
      expect(prevCalls.every((c) => c[1].p_end === selStart)).toBe(true)
      expect(prevCalls.map((c) => c[1].p_board ?? 'recent').sort()).toEqual(['main', 'recent', 'side'])
      expect(rpc.mock.calls.filter((c) => c[1].p_start === selStart)).toHaveLength(3)
    })

    it('skips the preceding calls under an event filter, leaving the trend blank', async () => {
      routeRpc({ main: [r('A', 8, 4)] })
      const { result } = renderHook(() =>
        useTrendingCards('ST', '7days', { eventId: 9 }, { selected: 8, preceding: 0 }),
      )
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(rpc).toHaveBeenCalledTimes(3)
      expect(result.current.spells[0]).toMatchObject({ playRatePct: 50, trend: null })
    })

    it('derives play rate and trend from the slice totals', async () => {
      const prevStart = precedingWindowStartISO('7days')
      routeWindows(
        prevStart,
        { main: [r('Bolt', 40, 19)], side: [r('Duress', 12, 6)], recent: [n('New', 20, 8)] },
        { main: [r('Bolt', 30, 10)], side: [], recent: [] },
      )
      const { result } = renderHook(() =>
        useTrendingCards('ST', '7days', {}, { selected: 50, preceding: 40 }),
      )
      await waitFor(() => expect(result.current.loading).toBe(false))

      // 19/50 = 38% now, 10/40 = 25% before -> +13pp
      expect(result.current.spells[0].playRatePct).toBeCloseTo(38, 5)
      expect(result.current.spells[0].trend).toMatchObject({ direction: 'up' })
      expect(result.current.spells[0].trend!.valuePct).toBeCloseTo(13, 5)
      // Absent before -> a rise of the full current rate
      expect(result.current.sideboard[0].trend!.valuePct).toBeCloseTo(12, 5)
      expect(result.current.newCards[0].playRatePct).toBeCloseTo(16, 5)
    })

    it('blanks only the trends when a preceding call fails', async () => {
      routeWindows(precedingWindowStartISO('7days'), { main: [r('Bolt', 40, 19)], recent: [n('New', 20, 8)] }, 'fail')
      const { result } = renderHook(() =>
        useTrendingCards('ST', '7days', {}, { selected: 50, preceding: 40 }),
      )
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBeNull()
      expect(result.current.newCardsError).toBeNull()
      expect(result.current.spells[0]).toMatchObject({ cardName: 'Bolt', trend: null })
      expect(result.current.spells[0].playRatePct).toBeCloseTo(38, 5)
      expect(result.current.newCards[0]).toMatchObject({ cardName: 'New', trend: null })
    })

    it('leaves play rates blank until the slice totals are known', async () => {
      routeRpc({ main: [r('Bolt', 40, 19)] })
      const { result } = renderHook(() => useTrendingCards('ST', '7days'))
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.spells[0]).toMatchObject({ playRatePct: null, trend: null })
    })

    it('re-derives on new slice totals without refetching', async () => {
      routeRpc({ main: [r('Bolt', 40, 10)] })
      const { result, rerender } = renderHook(
        ({ totals }: { totals: { selected: number; preceding: number } }) =>
          useTrendingCards('ST', '7days', {}, totals),
        { initialProps: { totals: { selected: 50, preceding: 50 } } },
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.spells[0].playRatePct).toBeCloseTo(20, 5)

      rerender({ totals: { selected: 20, preceding: 50 } })
      expect(result.current.spells[0].playRatePct).toBeCloseTo(50, 5)
      expect(rpc).toHaveBeenCalledTimes(6)
    })
  })
})
