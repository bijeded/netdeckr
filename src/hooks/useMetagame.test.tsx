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

  it('reports totals (events, distinct archetypes, decks) over the corpus', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'b', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({
        source_deck_id: 'c',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { id: 20, name: 'PTQ', event_date: daysAgo(3) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // 3 decks, 2 distinct archetypes (Izzet Lesson + Mono Red), 2 distinct events.
    expect(result.current.totals).toEqual({ events: 2, archetypes: 2, decks: 3 })
  })

  it('counts the distinct archetype total uncapped, beyond the grid top-N', async () => {
    // 25 archetypes -> breakdown caps at 20 but the total reports all 25.
    queryResult.data = Array.from({ length: 25 }, (_, i) =>
      deckRow({
        source_deck_id: `d${i}`,
        archetypes: { name: `Arch ${String(i).padStart(2, '0')}`, color_identity: '', art_image_url: null, art_crop_url: null },
        events: { id: 1, name: 'E', event_date: daysAgo(1) },
      }),
    )
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.breakdown).toHaveLength(20)
    expect(result.current.totals.archetypes).toBe(25)
    expect(result.current.totals.decks).toBe(25)
  })

  it('narrows the totals to the selected event', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({
        source_deck_id: 'b',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { id: 20, name: 'PTQ', event_date: daysAgo(3) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks', { eventId: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totals).toEqual({ events: 1, archetypes: 1, decks: 1 })
  })

  it('zeroes the totals on the empty and error paths', async () => {
    queryResult.data = []
    const { result: empty } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(empty.current.loading).toBe(false))
    expect(empty.current.totals).toEqual({ events: 0, archetypes: 0, decks: 0 })

    queryResult.data = null
    queryResult.error = { message: 'boom' }
    const { result: errored } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(errored.current.loading).toBe(false))
    expect(errored.current.totals).toEqual({ events: 0, archetypes: 0, decks: 0 })
  })

  it('lists the distinct events in the window corpus, most-recent-first', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'b', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'c', events: { id: 20, name: 'PTQ', event_date: daysAgo(4) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Distinct events (deduped by id), ordered most-recent-first.
    expect(result.current.events).toEqual([
      { id: 10, name: 'RCQ', eventDate: daysAgo(1) },
      { id: 20, name: 'PTQ', eventDate: daysAgo(4) },
    ])
  })

  it('restricts the breakdown to the selected event and recomputes share within it', async () => {
    queryResult.data = [
      // Event 10: Izzet x2, Mono Red x1  → within-event shares 2/3 and 1/3.
      deckRow({ source_deck_id: 'a', placement: '1', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'b', placement: '2', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({
        source_deck_id: 'c',
        placement: '1',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { id: 10, name: 'RCQ', event_date: daysAgo(1) },
      }),
      // Event 20: only Mono Red — must be excluded when event 10 is selected.
      deckRow({
        source_deck_id: 'd',
        placement: '1',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { id: 20, name: 'PTQ', event_date: daysAgo(4) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks', { eventId: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.breakdown.map((a) => a.name)).toEqual(['Izzet Lesson', 'Mono Red'])
    // Shares are within the selected event (3 decks total): 2/3 and 1/3, summing to 100%.
    expect(result.current.breakdown[0].sharePct).toBeCloseTo(66.67, 1)
    expect(result.current.breakdown[1].sharePct).toBeCloseTo(33.33, 1)
    const total = result.current.breakdown.reduce((s, a) => s + a.sharePct, 0)
    expect(total).toBeCloseTo(100, 1)
    // Decks are limited to the selected event.
    expect(result.current.decksByArchetype['Mono Red'].map((d) => d.sourceDeckId)).toEqual(['c'])
  })

  it('exposes every deck per archetype uncapped and date-desc in fullDecksByArchetype', async () => {
    queryResult.data = Array.from({ length: 8 }, (_, i) =>
      deckRow({
        source_deck_id: `d${i}`,
        placement: '5-8', // not Top 4 → capped branch would otherwise limit to 6
        events: { id: 30, name: 'League', event_date: daysAgo(i + 1) },
      }),
    )
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const full = result.current.fullDecksByArchetype['Izzet Lesson']
    // All 8 decks (cap lifted), most-recent-first.
    expect(full.map((d) => d.sourceDeckId)).toEqual(['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'])
    // The capped display list still respects the 6-deck cap.
    expect(result.current.decksByArchetype['Izzet Lesson']).toHaveLength(6)
  })

  it('orders full decks by date desc then placement (best finish first within an event)', async () => {
    queryResult.data = [
      // Same event/date, out-of-order placements.
      deckRow({ source_deck_id: 'p58', placement: '5-8', events: { id: 40, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'p1', placement: '1', events: { id: 40, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'p34', placement: '3-4', events: { id: 40, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'p2', placement: '2', events: { id: 40, name: 'RCQ', event_date: daysAgo(1) } }),
      // An older event's deck sorts after all of the recent event's decks.
      deckRow({ source_deck_id: 'old1', placement: '1', events: { id: 41, name: 'PTQ', event_date: daysAgo(5) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Within the recent event: 1 → 2 → 3-4 → 5-8; the older event's deck last.
    expect(result.current.fullDecksByArchetype['Izzet Lesson'].map((d) => d.sourceDeckId)).toEqual([
      'p1',
      'p2',
      'p34',
      'p58',
      'old1',
    ])
  })
})
