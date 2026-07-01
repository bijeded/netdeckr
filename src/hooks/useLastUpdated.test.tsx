import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// `eq` is chainable so the hook can filter on both format_code and meta_window.
const queryResult = { data: null as unknown, error: null as unknown }
const { from, eq, single } = vi.hoisted(() => {
  const single = vi.fn(() => Promise.resolve(queryResult))
  const eq = vi.fn(() => ({ eq, single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, eq, single }
})

vi.mock('../lib/supabase', () => ({ supabase: { from } }))

import { useLastUpdated } from './useLastUpdated'

describe('useLastUpdated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('reads the (format, window) freshness row and returns its last_updated_at', async () => {
    queryResult.data = { last_updated_at: '2026-07-01T12:00:00Z' }
    const { result } = renderHook(() => useLastUpdated('ST', '2months'))

    await waitFor(() => expect(result.current).toBe('2026-07-01T12:00:00Z'))
    expect(from).toHaveBeenCalledWith('format_window_freshness')
    expect(eq).toHaveBeenCalledWith('format_code', 'ST')
    expect(eq).toHaveBeenCalledWith('meta_window', '2months')
    expect(single).toHaveBeenCalled()
  })

  it('returns null when there is no timestamp or an error', async () => {
    queryResult.error = { message: 'boom' }
    const { result } = renderHook(() => useLastUpdated('ST', '5days'))
    await waitFor(() => expect(single).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
