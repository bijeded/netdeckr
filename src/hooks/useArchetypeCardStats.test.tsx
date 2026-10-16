import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { rpc, pending } = vi.hoisted(() => {
  const pending: Array<(value: { data: unknown; error: unknown }) => void> = []
  const rpc = vi.fn(
    () => new Promise<{ data: unknown; error: unknown }>((resolve) => pending.push(resolve)),
  )
  return { rpc, pending }
})

vi.mock('../lib/supabase', () => ({ supabase: { rpc } }))

import { useArchetypeCardStats } from './useArchetypeCardStats'
import { windowStartISO } from '../lib/windows'

const raw = {
  board: 'main',
  card_name: 'Fire // Ice',
  scraped_name: 'Fire / Ice',
  deck_ids: [1, 2],
  quantities: [4, 3],
  type_line: 'Instant',
  cmc: '4',
  rarity: 'rare',
  set_code: 'MH2',
  collector_number: '290',
  image_url: 'normal.jpg',
  small_image_url: null,
}

describe('useArchetypeCardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pending.length = 0
  })

  it('does not query without an archetype id', () => {
    const { result } = renderHook(() => useArchetypeCardStats('ST', null))
    expect(rpc).not.toHaveBeenCalled()
    expect(result.current).toEqual({ rows: [], loading: false, error: null })
  })

  it('calls the RPC for the 2-week window and maps rows', async () => {
    const { result } = renderHook(() => useArchetypeCardStats('MO', 42))
    expect(result.current.loading).toBe(true)
    expect(rpc).toHaveBeenCalledWith(
      'archetype_card_stats',
      expect.objectContaining({ p_format: 'MO', p_archetype_id: 42, p_start: windowStartISO('2weeks') }),
    )
    pending[0]({ data: [raw], error: null })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toEqual([
      {
        board: 'main',
        name: 'Fire // Ice',
        scrapedName: 'Fire / Ice',
        deckIds: [1, 2],
        quantities: [4, 3],
        typeLine: 'Instant',
        cmc: 4,
        rarity: 'rare',
        setCode: 'MH2',
        collectorNumber: '290',
        imageUrl: 'normal.jpg',
        thumbnailUrl: 'normal.jpg',
      },
    ])
  })

  it('surfaces an error', async () => {
    const { result } = renderHook(() => useArchetypeCardStats('ST', 1))
    const error = { message: 'timeout' }
    pending[0]({ data: null, error })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(error)
    expect(result.current.rows).toEqual([])
  })

  it('discards a response for a previous archetype', async () => {
    const { result, rerender } = renderHook(({ id }) => useArchetypeCardStats('ST', id), {
      initialProps: { id: 1 },
    })
    rerender({ id: 2 })
    pending[1]({ data: [{ ...raw, card_name: 'Current' }], error: null })
    await waitFor(() => expect(result.current.loading).toBe(false))
    pending[0]({ data: [{ ...raw, card_name: 'Stale' }], error: null })
    await Promise.resolve()
    expect(result.current.rows.map((r) => r.name)).toEqual(['Current'])
  })
})
