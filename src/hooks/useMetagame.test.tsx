import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { windowStartISO } from '../lib/windows'

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

/** ISO date `n` days before now (the hook filters by the real current date). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function deckRow(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    source_deck_id: '1',
    player: 'Player',
    placement: '1',
    archetypes: { name: 'Izzet Lesson', color_identity: 'UR', art_image_url: null, art_crop_url: null },
    events: { name: 'RCQ', event_date: daysAgo(1) },
    ...over,
  }
}

describe('useMetagame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = null
    queryResult.error = null
  })

  it('fetches the 2-week corpus and derives the breakdown, tiers, and display decks', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', placement: '1' }),
      deckRow({ source_deck_id: 'b', placement: '3-4' }),
      deckRow({
        source_deck_id: 'c',
        placement: '1',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { name: 'MTGO', event_date: daysAgo(2) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('decks')
    expect(eq).toHaveBeenCalledWith('events.format_code', 'ST')
    // Always fetches the 2-week window (the selected window is a client-side subset).
    expect(gte).toHaveBeenCalledWith('events.event_date', windowStartISO('2weeks'))

    // Breakdown derived from deck counts: Izzet Lesson 2/3, Mono Red 1/3.
    expect(result.current.breakdown.map((a) => a.name)).toEqual(['Izzet Lesson', 'Mono Red'])
    expect(result.current.breakdown[0].sharePct).toBeCloseTo(66.67, 1)
    expect(result.current.breakdown[0].rank).toBe(1)
    // Every card carries a performance tier; on the 2-week baseline there is no trend arrow.
    expect(['T1', 'T2', 'T3', 'Otros']).toContain(result.current.breakdown[0].tier)
    expect(result.current.breakdown.every((a) => a.trend === null)).toBe(true)

    // Same rows drive the drill-down decks.
    expect(result.current.decksByArchetype['Izzet Lesson'].map((d) => d.sourceDeckId)).toEqual(['a', 'b'])
    expect(result.current.decksByArchetype['Mono Red'].map((d) => d.sourceDeckId)).toEqual(['c'])
  })

  it('narrows the breakdown to the selected window and computes a trend vs the 2-week baseline', async () => {
    queryResult.data = [
      // Recent, strong Izzet decks (inside the 5-day window).
      deckRow({ source_deck_id: 'r1', placement: '1', events: { name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'r2', placement: '1', events: { name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'r3', placement: '1', events: { name: 'E', event_date: daysAgo(2) } }),
      // Older, weaker Izzet decks (inside 2 weeks, outside 5 days) — lower the baseline.
      deckRow({ source_deck_id: 'o1', placement: '9-16', events: { name: 'E', event_date: daysAgo(10) } }),
      deckRow({ source_deck_id: 'o2', placement: '9-16', events: { name: 'E', event_date: daysAgo(11) } }),
      // Mono Red only appears outside the 5-day window → excluded from the 5-day breakdown.
      deckRow({
        source_deck_id: 'm1',
        placement: '1',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { name: 'E', event_date: daysAgo(10) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '5days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Only Izzet Lesson has decks within the last 5 days.
    expect(result.current.breakdown.map((a) => a.name)).toEqual(['Izzet Lesson'])
    // Recent finishes (all 1st) beat the 2-week baseline (which includes the 9-16s) → up.
    expect(result.current.breakdown[0].trend).toBe('up')
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
