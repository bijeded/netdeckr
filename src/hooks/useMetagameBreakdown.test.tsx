import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Chainable query-builder mock that resolves to { data, error }.
// `eq` is chainable so the hook can filter on both format_code and meta_window.
const { from, eq, order, limit, queryResult } = vi.hoisted(() => {
  const queryResult = { data: null as unknown, error: null as unknown }
  const limit = vi.fn(() => Promise.resolve(queryResult))
  const order = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ eq, order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, select, eq, order, limit, queryResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { from } }))

import { useMetagameBreakdown } from './useMetagameBreakdown'

describe('useMetagameBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('queries snapshots for the format and window, ordered by rank, limited to 20', async () => {
    queryResult.data = [
      { rank: 1, share_pct: 23, archetypes: { name: 'Izzet Control', color_identity: 'UR' } },
    ]
    const { result } = renderHook(() => useMetagameBreakdown('ST', '2months'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('metagame_snapshots')
    expect(eq).toHaveBeenCalledWith('format_code', 'ST')
    expect(eq).toHaveBeenCalledWith('meta_window', '2months')
    expect(order).toHaveBeenCalledWith('rank')
    expect(limit).toHaveBeenCalledWith(20)
    expect(result.current.data).toEqual([
      { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 23 },
    ])
    expect(result.current.error).toBeNull()
  })

  it('starts in a loading state', () => {
    const { result } = renderHook(() => useMetagameBreakdown('ST', '5days'))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])
  })

  it('exposes an error and empty data when the query fails', async () => {
    queryResult.error = { message: 'boom' }
    const { result } = renderHook(() => useMetagameBreakdown('ST', '5days'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toEqual({ message: 'boom' })
    expect(result.current.data).toEqual([])
  })
})
