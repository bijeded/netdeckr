import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { corpusFetchStartISO } from '../lib/windows'

// Chainable query-builder mock resolving to { data, error }.
// decks -> select -> eq(format) -> gte(date) -> order(date desc) -> order(id)
//   -> range(from, to) => a page of rows (a slice of queryResult.data), so the
// hook's pagination loop is exercised.
const { from, eq, gte, range, queryResult } = vi.hoisted(() => {
  const queryResult = { data: null as unknown, error: null as unknown }
  const range = vi.fn((f: number, t: number) =>
    Promise.resolve(
      queryResult.error
        ? { data: null, error: queryResult.error }
        : { data: ((queryResult.data as unknown[]) ?? []).slice(f, t + 1), error: null },
    ),
  )
  const orderChain = { range } as { range: typeof range; order: () => typeof orderChain }
  const order = vi.fn(() => orderChain)
  orderChain.order = order
  const gte = vi.fn((..._args: unknown[]) => ({ order }))
  const eq = vi.fn(() => ({ gte }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, eq, gte, range, queryResult }
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
    // Fetches a 28-day corpus (two 2-week windows) so the preceding equal-length
    // slice is available for the week-over-week share delta; the selected window
    // and its preceding slice are both client-side subsets of this fetch.
    expect(gte).toHaveBeenCalledWith('events.event_date', corpusFetchStartISO())

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
      // Recent, strong Izzet decks (inside the 7-day window).
      deckRow({ source_deck_id: 'r1', placement: '1', events: { name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'r2', placement: '1', events: { name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'r3', placement: '1', events: { name: 'E', event_date: daysAgo(2) } }),
      // Older, weaker Izzet decks (inside 2 weeks, outside 7 days) — lower the baseline.
      deckRow({ source_deck_id: 'o1', placement: '9-16', events: { name: 'E', event_date: daysAgo(10) } }),
      deckRow({ source_deck_id: 'o2', placement: '9-16', events: { name: 'E', event_date: daysAgo(11) } }),
      // Mono Red only appears outside the 7-day window → excluded from the 7-day breakdown.
      deckRow({
        source_deck_id: 'm1',
        placement: '1',
        archetypes: { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null },
        events: { name: 'E', event_date: daysAgo(10) },
      }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '7days'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Only Izzet Lesson has decks within the last 7 days.
    expect(result.current.breakdown.map((a) => a.name)).toEqual(['Izzet Lesson'])
    // Recent finishes (all 1st) beat the 2-week baseline (which includes the 9-16s) → up.
    expect(result.current.breakdown[0].trend).toBe('up')
  })

  it('paginates past the 1000-row PostgREST cap to fetch the whole corpus', async () => {
    // 1500 decks exceed PostgREST's default 1000-row page, so a single request
    // would silently truncate the corpus (dropping the oldest rows under the
    // date-desc order). The hook must page until a short page is returned.
    queryResult.data = Array.from({ length: 1500 }, (_, i) =>
      deckRow({ source_deck_id: `d${i}`, events: { id: 1, name: 'E', event_date: daysAgo(1) } }),
    )
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals.decks).toBe(1500)
    expect(range).toHaveBeenCalledTimes(2)
    expect(range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
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

  it('exposes the full uncapped breakdown, matching the distinct archetype total', async () => {
    // 25 archetypes -> the breakdown is uncapped (display slicing happens in the
    // grid, not the hook), so it reports all 25, matching the distinct total.
    queryResult.data = Array.from({ length: 25 }, (_, i) =>
      deckRow({
        source_deck_id: `d${i}`,
        archetypes: { name: `Arch ${String(i).padStart(2, '0')}`, color_identity: '', art_image_url: null, art_crop_url: null },
        events: { id: 1, name: 'E', event_date: daysAgo(1) },
      }),
    )
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.breakdown).toHaveLength(25)
    expect(result.current.totals.archetypes).toBe(25)
    expect(result.current.totals.decks).toBe(25)
  })

  it('tiers every archetype in the uncapped breakdown against the whole 2-week corpus', async () => {
    // 15 archetypes (beyond the 12 grid cap): strong finishers first, weak last.
    queryResult.data = Array.from({ length: 15 }, (_, i) =>
      deckRow({
        source_deck_id: `d${i}`,
        placement: i < 5 ? '1' : i < 10 ? '5-8' : '17-32',
        archetypes: { name: `Arch ${String(i).padStart(2, '0')}`, color_identity: '', art_image_url: null, art_crop_url: null },
        events: { id: 1, name: 'E', event_date: daysAgo(1) },
      }),
    )
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // The breakdown is uncapped (all 15) and every card — including those past the
    // top-12 display cap — carries a tier from the whole-corpus reference field.
    expect(result.current.breakdown).toHaveLength(15)
    for (const a of result.current.breakdown) {
      expect(['T1', 'T2', 'T3', 'Otros']).toContain(a.tier)
    }
    // The strong-finisher head strictly out-tiers the weak tail (whole-corpus
    // Jenks field discriminates the three clusters).
    const byName = Object.fromEntries(result.current.breakdown.map((a) => [a.name, a.tier]))
    const rank = { T1: 0, T2: 1, T3: 2, Otros: 3 } as const
    expect(rank[byName['Arch 00']]).toBeLessThan(rank[byName['Arch 14']])
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

  it('lists the distinct events in the window corpus, most-recent-first, with size', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 10, name: 'RCQ', event_date: daysAgo(1), player_count: 128 } }),
      deckRow({ source_deck_id: 'b', events: { id: 10, name: 'RCQ', event_date: daysAgo(1), player_count: 128 } }),
      deckRow({ source_deck_id: 'c', events: { id: 20, name: 'PTQ', event_date: daysAgo(4) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Distinct events (deduped by id), ordered most-recent-first, carrying the
    // tournament size (null when the event has no player_count) and the number
    // of decks the event contributes to the window corpus.
    expect(result.current.events).toEqual([
      { id: 10, name: 'RCQ', eventDate: daysAgo(1), playerCount: 128, deckCount: 2 },
      { id: 20, name: 'PTQ', eventDate: daysAgo(4), playerCount: null, deckCount: 1 },
    ])
  })

  it('counts each event\'s decks before the event filter, so every option keeps its weight', async () => {
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'b', events: { id: 10, name: 'RCQ', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'c', events: { id: 20, name: 'PTQ', event_date: daysAgo(4) } }),
    ]
    // Filtered down to event 10 — the other event's count must survive, since the
    // Events modal has to list every option while one of them is selected.
    const { result } = renderHook(() => useMetagame('ST', '7days', { eventId: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.events.map((e) => [e.id, e.deckCount])).toEqual([
      [10, 2],
      [20, 1],
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

  it('attaches a period-over-period share delta to each breakdown entry', async () => {
    const mono = { name: 'Mono Red', color_identity: 'R', art_image_url: null, art_crop_url: null }
    queryResult.data = [
      // Selected slice (last 14 days): Izzet 3, Mono 1 → Izzet 75%, Mono 25%.
      deckRow({ source_deck_id: 's1', events: { id: 1, name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 's2', events: { id: 1, name: 'E', event_date: daysAgo(2) } }),
      deckRow({ source_deck_id: 's3', events: { id: 1, name: 'E', event_date: daysAgo(3) } }),
      deckRow({ source_deck_id: 's4', archetypes: mono, events: { id: 1, name: 'E', event_date: daysAgo(3) } }),
      // Preceding slice (days 16–28): Izzet 1, Mono 3 → Izzet 25%, Mono 75%.
      deckRow({ source_deck_id: 'p1', events: { id: 2, name: 'E', event_date: daysAgo(18) } }),
      deckRow({ source_deck_id: 'p2', archetypes: mono, events: { id: 2, name: 'E', event_date: daysAgo(18) } }),
      deckRow({ source_deck_id: 'p3', archetypes: mono, events: { id: 2, name: 'E', event_date: daysAgo(20) } }),
      deckRow({ source_deck_id: 'p4', archetypes: mono, events: { id: 2, name: 'E', event_date: daysAgo(22) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const byName = Object.fromEntries(result.current.breakdown.map((a) => [a.name, a]))
    // The breakdown itself only reflects the selected (last-14-day) decks: Izzet 75%.
    expect(byName['Izzet Lesson'].sharePct).toBeCloseTo(75, 1)
    // Izzet rose (25% → 75%), Mono fell (75% → 25%).
    expect(byName['Izzet Lesson'].shareDelta?.direction).toBe('up')
    expect(byName['Izzet Lesson'].shareDelta?.valuePct).toBeCloseTo(50, 1)
    expect(byName['Mono Red'].shareDelta?.direction).toBe('down')
  })

  it('suppresses the share delta (null) when the preceding slice is too thin', async () => {
    // Only recent decks; no preceding-slice data → the whole field is suppressed.
    queryResult.data = [
      deckRow({ source_deck_id: 'a', events: { id: 1, name: 'E', event_date: daysAgo(1) } }),
      deckRow({ source_deck_id: 'b', events: { id: 1, name: 'E', event_date: daysAgo(2) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.breakdown.every((a) => a.shareDelta === null)).toBe(true)
  })

  it('excludes decks older than the selected window from the breakdown while using them for the delta', async () => {
    queryResult.data = [
      // One selected Izzet deck (last 14 days).
      deckRow({ source_deck_id: 's1', events: { id: 1, name: 'E', event_date: daysAgo(2) } }),
      // Preceding-slice decks (days 16–28) — must NOT appear in the breakdown/decks,
      // and must not change Izzet's selected-window share (still 100%).
      deckRow({ source_deck_id: 'p1', events: { id: 2, name: 'E', event_date: daysAgo(18) } }),
      deckRow({ source_deck_id: 'p2', events: { id: 2, name: 'E', event_date: daysAgo(20) } }),
      deckRow({ source_deck_id: 'p3', events: { id: 2, name: 'E', event_date: daysAgo(22) } }),
    ]
    const { result } = renderHook(() => useMetagame('ST', '2weeks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Breakdown/decks/totals reflect only the selected 14-day window (1 deck).
    expect(result.current.totals.decks).toBe(1)
    expect(result.current.decksByArchetype['Izzet Lesson'].map((d) => d.sourceDeckId)).toEqual(['s1'])
    expect(result.current.breakdown[0].sharePct).toBeCloseTo(100, 1)
    // But the preceding decks fed the delta: 100% now vs 100% before → flat.
    expect(result.current.breakdown[0].shareDelta?.direction).toBe('flat')
  })

  describe('event-size filter', () => {
    /**
     * Three events, one per size band plus one the source never sized. Each
     * carries a different archetype so a band's effect is visible in the
     * breakdown, not just in the counts.
     */
    function sizedCorpus() {
      const archetype = (name: string, ci: string) => ({
        name,
        color_identity: ci,
        art_image_url: null,
        art_crop_url: null,
      })
      return [
        deckRow({
          source_deck_id: 'small',
          archetypes: archetype('Small Deck', 'R'),
          events: { id: 1, name: 'FNM', event_date: daysAgo(1), player_count: 20 },
        }),
        deckRow({
          source_deck_id: 'large',
          archetypes: archetype('Large Deck', 'U'),
          events: { id: 2, name: 'RC', event_date: daysAgo(2), player_count: 128 },
        }),
        deckRow({
          source_deck_id: 'none',
          archetypes: archetype('Unsized Deck', 'G'),
          events: { id: 3, name: 'League', event_date: daysAgo(3), player_count: null },
        }),
      ]
    }

    it('keeps every event when no size class is selected', async () => {
      queryResult.data = sizedCorpus()
      const { result } = renderHook(() => useMetagame('ST', '2weeks'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      // The unsized event is present by default — it is not hidden for lacking a size.
      expect(result.current.totals.decks).toBe(3)
      expect(result.current.events.map((e) => e.id).sort()).toEqual([1, 2, 3])
    })

    it('narrows the corpus to the selected size class and recomputes shares within it', async () => {
      queryResult.data = sizedCorpus()
      const { result } = renderHook(() => useMetagame('ST', '2weeks', { sizeClass: 'small' }))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.breakdown.map((a) => a.name)).toEqual(['Small Deck'])
      // Share is recomputed within the retained decks, not over the full window.
      expect(result.current.breakdown[0].sharePct).toBeCloseTo(100, 1)
      expect(result.current.totals.decks).toBe(1)
      expect(result.current.totals.events).toBe(1)
    })

    it('matches an unsized event only under the unsized class', async () => {
      queryResult.data = sizedCorpus()
      const { result: unsized } = renderHook(() =>
        useMetagame('ST', '2weeks', { sizeClass: 'unsized' }),
      )
      await waitFor(() => expect(unsized.current.loading).toBe(false))
      expect(unsized.current.breakdown.map((a) => a.name)).toEqual(['Unsized Deck'])

      // And it is emphatically not folded into Small, the way sizeWeight() treats null.
      const { result: small } = renderHook(() => useMetagame('ST', '2weeks', { sizeClass: 'small' }))
      await waitFor(() => expect(small.current.loading).toBe(false))
      expect(small.current.breakdown.map((a) => a.name)).not.toContain('Unsized Deck')
    })

    it('narrows the event options so an unreachable event is never offered', async () => {
      queryResult.data = sizedCorpus()
      const { result } = renderHook(() => useMetagame('ST', '2weeks', { sizeClass: 'large' }))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.events.map((e) => e.id)).toEqual([2])
    })

    it('yields an empty result for a size class no event falls into', async () => {
      queryResult.data = sizedCorpus()
      const { result } = renderHook(() => useMetagame('ST', '2weeks', { sizeClass: 'massive' }))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.breakdown).toEqual([])
      expect(result.current.events).toEqual([])
      expect(result.current.totals.decks).toBe(0)
    })

    it('leaves tier assignment unchanged when a size class is selected', async () => {
      queryResult.data = sizedCorpus()
      const { result: all } = renderHook(() => useMetagame('ST', '2weeks'))
      await waitFor(() => expect(all.current.loading).toBe(false))
      const unfilteredTier = all.current.breakdown.find((a) => a.name === 'Large Deck')?.tier

      const { result: filtered } = renderHook(() =>
        useMetagame('ST', '2weeks', { sizeClass: 'large' }),
      )
      await waitFor(() => expect(filtered.current.loading).toBe(false))

      // Tiers stay anchored to the whole 2-week field, so narrowing by size does
      // not re-tier the archetypes that survive the filter.
      expect(filtered.current.breakdown[0].tier).toBe(unfilteredTier)
    })

    it('combines the size and event filters', async () => {
      queryResult.data = sizedCorpus()
      const { result } = renderHook(() =>
        useMetagame('ST', '2weeks', { sizeClass: 'large', eventId: 2 }),
      )
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.breakdown.map((a) => a.name)).toEqual(['Large Deck'])

      // An event outside the size class yields nothing, rather than the size
      // filter being quietly dropped.
      const { result: contradictory } = renderHook(() =>
        useMetagame('ST', '2weeks', { sizeClass: 'large', eventId: 1 }),
      )
      await waitFor(() => expect(contradictory.current.loading).toBe(false))
      expect(contradictory.current.breakdown).toEqual([])
    })
  })
  describe('unranked (published-ladder) events', () => {
    /**
     * Two archetypes with an identical record of eight 1st-place finishes. One
     * earned them at a real tournament (bracket ranges, recorded field); the
     * other at a published ladder, which records a position for every deck it
     * publishes without those positions meaning anything.
     */
    function ladderVsBracket() {
      const rows = []
      for (let i = 0; i < 8; i++) {
        rows.push(
          deckRow({
            id: 100 + i,
            source_deck_id: `ladder-${i}`,
            // All 1st: scored positionally this ties the bracket record exactly,
            // so the assertion below can only pass if the flattening is applied.
            placement: '1',
            archetypes: { name: 'Ladder Deck', color_identity: 'U', art_image_url: null, art_crop_url: null },
            // No player_count and a flat run of positions: the unranked shape.
            events: { id: 1, name: 'MTGO League', event_date: daysAgo(1), player_count: null },
          }),
        )
        rows.push(
          deckRow({
            id: 200 + i,
            source_deck_id: `bracket-${i}`,
            placement: '1',
            archetypes: { name: 'Bracket Deck', color_identity: 'R', art_image_url: null, art_crop_url: null },
            // A bracket range somewhere in the event proves a real ranking.
            events: { id: 2, name: 'RCQ', event_date: daysAgo(1), player_count: 64 },
          }),
        )
      }
      // One deck carrying the range, so event 2 is unambiguously ranked.
      rows.push(
        deckRow({
          id: 299,
          source_deck_id: 'bracket-range',
          placement: '3-4',
          archetypes: { name: 'Bracket Deck', color_identity: 'R', art_image_url: null, art_crop_url: null },
          events: { id: 2, name: 'RCQ', event_date: daysAgo(1), player_count: 64 },
        }),
      )
      return rows
    }

    // NOTE: the flattening itself cannot be isolated here. An unranked event is
    // by definition unsized, so it also takes the size-weight floor, and that
    // alone separates the two archetypes' tiers whether or not the flag applies.
    // The flattening is covered where sizes can be held constant: see
    // `attachPowerTiers — unranked finishes` in ../lib/metagame.test.ts.

    it('keeps ladder decks in the corpus, counted for share and totals', async () => {
      queryResult.data = ladderVsBracket()
      const { result } = renderHook(() => useMetagame('ST', '2weeks'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      // Flattening the ordering must not drop the decks: they still appear, still
      // count toward the deck total, and still hold metagame share.
      const ladder = result.current.breakdown.find((a) => a.name === 'Ladder Deck')!
      expect(ladder.sharePct).toBeGreaterThan(0)
      expect(result.current.totals.decks).toBe(17)
      expect(result.current.totals.events).toBe(2)
    })
  })
})
