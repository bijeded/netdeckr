import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { precedingWindowStartISO, windowStartISO, type WindowCode } from '../lib/windows'
import { sizeClassOf, type EventSizeClass } from '../lib/eventSize'
import { sliceDeckTotal } from '../lib/trendingCards'

// Drift guard for the trending play rate (design: Risks). The numerator — each
// card's deck_count — comes from the `top_cards` / `recent_set_top_cards` RPCs,
// whose filter block lives in SQL (supabase/schema.sql). The denominator comes
// from useMetagame's client-side corpus. If the two ever narrow the slice
// differently, play rates silently go wrong (or past 100%).
//
// `rpcSliceDecks` below restates that SQL WHERE clause — window, archetype ids,
// single event, event-id set, whole-deck legality — over a fixture corpus. For
// every filter combination, the denominator the dashboard computes must equal the
// number of decks that predicate admits: equal, not merely ≥, so an over-wide
// denominator (a dropped filter on the client side) fails too.

const { from, rpc, queryResult, illegalResult } = vi.hoisted(() => {
  const queryResult = { data: [] as unknown[] }
  const illegalResult = { data: [] as unknown, error: null as unknown }
  const range = vi.fn((f: number, t: number) =>
    Promise.resolve({ data: queryResult.data.slice(f, t + 1), error: null }),
  )
  const orderChain = { range } as { range: typeof range; order: () => typeof orderChain }
  const order = vi.fn(() => orderChain)
  orderChain.order = order
  const gte = vi.fn(() => ({ order }))
  const eq = vi.fn(() => ({ gte }))
  const select = vi.fn(() => ({ eq }))
  const bannedSelect = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
  const from = vi.fn((table: string) => (table === 'banned_cards' ? { select: bannedSelect } : { select }))
  const rpc = vi.fn(() => Promise.resolve(illegalResult))
  return { from, rpc, queryResult, illegalResult }
})

vi.mock('../lib/supabase', () => ({ supabase: { from, rpc } }))

import { useMetagame } from './useMetagame'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

interface FixtureDeck {
  id: number
  archetype: string
  eventId: number
  age: number
}

/** Events across both windows of either time frame, of mixed sizes. */
const EVENTS: Record<number, { playerCount: number | null }> = {
  1: { playerCount: 250 },
  2: { playerCount: 12 },
  3: { playerCount: null },
  4: { playerCount: 250 },
  5: { playerCount: 12 },
  6: { playerCount: 64 },
}

const DECKS: FixtureDeck[] = [
  { id: 1, archetype: 'Izzet', eventId: 1, age: 1 },
  { id: 2, archetype: 'Izzet', eventId: 2, age: 2 },
  { id: 3, archetype: 'Mono Red', eventId: 1, age: 1 },
  { id: 4, archetype: 'Domain', eventId: 3, age: 5 },
  { id: 5, archetype: 'Mono Red', eventId: 4, age: 9 },
  { id: 6, archetype: 'Izzet', eventId: 4, age: 9 },
  { id: 7, archetype: 'Domain', eventId: 5, age: 12 },
  { id: 8, archetype: 'Izzet', eventId: 6, age: 18 },
  { id: 9, archetype: 'Mono Red', eventId: 6, age: 18 },
  { id: 10, archetype: 'Domain', eventId: 6, age: 25 },
]

/** Decks holding a banned card (the `illegal_deck_ids` RPC / the SQL not-exists). */
const ILLEGAL = new Set([3, 6, 9])

function corpusRows() {
  return DECKS.map((d) => ({
    id: d.id,
    source_deck_id: String(d.id),
    player: 'P',
    placement: '1',
    archetypes: { name: d.archetype, color_identity: 'R', art_image_url: null, art_crop_url: null },
    events: {
      id: d.eventId,
      name: `Event ${d.eventId}`,
      event_date: daysAgo(d.age),
      format_code: 'ST',
      player_count: EVENTS[d.eventId].playerCount,
    },
  }))
}

/**
 * The decks `top_cards` admits for a slice, as its SQL WHERE clause states it:
 * `event_date >= p_start and event_date < p_end`, `archetype_id = any(ids)`,
 * `event_id = p_event_id`, `event_id = any(p_event_ids)`, and no banned card in
 * the deck. Keep in step with supabase/schema.sql.
 */
function rpcSliceDecks(
  start: string,
  end: string,
  archetypes: string[] | null,
  eventId: number | null,
  eventIds: number[] | null,
  illegal: Set<number>,
): number {
  return DECKS.filter((d) => {
    const date = daysAgo(d.age)
    return (
      date >= start &&
      date < end &&
      (archetypes === null || archetypes.includes(d.archetype)) &&
      (eventId === null || d.eventId === eventId) &&
      (eventIds === null || eventIds.includes(d.eventId)) &&
      !illegal.has(d.id)
    )
  }).length
}

interface Combo {
  label: string
  archetypes: string[] | null
  eventId: number | null
  sizeClass: EventSizeClass | null
  banned: boolean
}

const COMBOS: Combo[] = [
  { label: 'no filter', archetypes: null, eventId: null, sizeClass: null, banned: false },
  { label: 'archetype', archetypes: ['Izzet'], eventId: null, sizeClass: null, banned: false },
  { label: 'tier (several archetypes)', archetypes: ['Izzet', 'Domain'], eventId: null, sizeClass: null, banned: false },
  { label: 'event', archetypes: null, eventId: 1, sizeClass: null, banned: false },
  { label: 'size', archetypes: null, eventId: null, sizeClass: 'massive', banned: false },
  { label: 'unsized class', archetypes: null, eventId: null, sizeClass: 'unsized', banned: false },
  { label: 'banned deck present', archetypes: null, eventId: null, sizeClass: null, banned: true },
  { label: 'everything at once', archetypes: ['Izzet', 'Mono Red'], eventId: null, sizeClass: 'massive', banned: true },
  { label: 'event + archetype + ban', archetypes: ['Izzet'], eventId: 1, sizeClass: null, banned: true },
]

describe('trending play-rate denominator matches the RPC slice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult.data = corpusRows()
    illegalResult.data = []
  })

  for (const window of ['7days', '2weeks'] as WindowCode[]) {
    for (const combo of COMBOS) {
      it(`${window} · ${combo.label}`, async () => {
        const illegal = combo.banned ? ILLEGAL : new Set<number>()
        illegalResult.data = [...illegal].map((deck_id) => ({ deck_id }))
        const { result } = renderHook(() =>
          useMetagame('ST', window, { eventId: combo.eventId, sizeClass: combo.sizeClass }),
        )
        await waitFor(() => expect(result.current.loading).toBe(false))

        const { sliceDeckCounts, sizeClassEventIds } = result.current
        // The id list App sends as `p_event_ids` is exactly the size class's events.
        const expectedSizeIds =
          combo.sizeClass === null
            ? null
            : Object.keys(EVENTS)
                .map(Number)
                .filter((id) => sizeClassOf(EVENTS[id].playerCount) === combo.sizeClass)
                .filter((id) => DECKS.some((d) => d.eventId === id && !illegal.has(d.id) && d.age <= 28))
        expect(sizeClassEventIds === null ? null : [...sizeClassEventIds].sort()).toEqual(
          expectedSizeIds === null ? null : expectedSizeIds.sort(),
        )

        const tomorrow = daysAgo(-1)
        const selStart = windowStartISO(window)
        const prevStart = precedingWindowStartISO(window)

        expect(sliceDeckTotal(sliceDeckCounts.selected, combo.archetypes)).toBe(
          rpcSliceDecks(selStart, tomorrow, combo.archetypes, combo.eventId, sizeClassEventIds, illegal),
        )
        expect(sliceDeckTotal(sliceDeckCounts.preceding, combo.archetypes)).toBe(
          rpcSliceDecks(prevStart, selStart, combo.archetypes, combo.eventId, sizeClassEventIds, illegal),
        )
      })
    }
  }
})
