import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { WINDOW_DAYS, windowStartISO, type WindowCode } from '../lib/windows'
import { rankTrendingCards, type TopCardRow, type TrendingCard } from '../lib/trendingCards'

const DAY_MS = 24 * 60 * 60 * 1000

/** ISO date (YYYY-MM-DD) `days` before `now` (negative = ahead). */
function isoOffset(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10)
}

/** A raw row from the `top_cards` RPC. */
interface TopCardQueryRow {
  card_name: string
  total_copies: number
  deck_count: number
  image_url: string | null
}

const toRows = (data: TopCardQueryRow[] | null): TopCardRow[] =>
  (data ?? []).map((row) => ({
    cardName: row.card_name,
    totalCopies: row.total_copies,
    deckCount: row.deck_count,
    imageUrl: row.image_url,
  }))

/** Optional view filters, mirroring the sidebar. Undefined/null = unfiltered. */
export interface TrendingFilters {
  /** Restrict to these archetypes (an archetype or tier selection). null/omitted = all. */
  archetypeNames?: string[] | null
  /** Restrict to a single event; suppresses the period delta. null/omitted = all. */
  eventId?: number | null
}

interface TrendingState {
  trending: TrendingCard[]
  sideboard: TrendingCard[]
  loading: boolean
  error: unknown
}

const EMPTY: TrendingState = { trending: [], sideboard: [], loading: false, error: null }

/** Resolve selected archetype names to their per-format ids for the RPC filter. */
async function resolveArchetypeIds(format: FormatCode, names: string[]): Promise<number[]> {
  const { data, error } = await supabase
    .from('archetypes')
    .select('id, name')
    .eq('format_code', format)
    .in('name', names)
  if (error) throw error
  // A total resolution miss yields [] -> an empty slice -> empty tables, which is
  // the intended "no matching archetypes" outcome (distinct from null = all).
  return ((data as { id: number }[] | null) ?? []).map((a) => a.id)
}

/** One call to the top_cards RPC, mapped to TopCardRow[]. */
async function callTopCards(
  format: FormatCode,
  start: string,
  end: string,
  board: 'main' | 'side',
  archetypeIds: number[] | null,
  eventId: number | null,
): Promise<TopCardRow[]> {
  const { data, error } = await supabase.rpc('top_cards', {
    p_format: format,
    p_start: start,
    p_end: end,
    p_board: board,
    p_archetype_ids: archetypeIds,
    p_event_id: eventId,
  })
  if (error) throw error
  return toRows(data as TopCardQueryRow[] | null)
}

/**
 * The trending-cards tables for a format + time frame: the "En Tendencia"
 * mainboard table (ranked by copy share, with a period-over-period delta) and the
 * Top Sideboard Cards list (share only). Both derive from the `top_cards` RPC —
 * one call per window/board — so the browser never pulls raw deck_cards. The
 * mainboard delta compares the selected window to the immediately-preceding
 * equal-length window (both within the 30-day retention).
 *
 * Filters mirror the sidebar: `archetypeNames` (an archetype or tier selection)
 * narrows all calls via resolved ids; `eventId` narrows the current-window calls
 * and suppresses the delta (a single point-in-time event has no preceding period).
 * The preceding-window deck count is proxied by the top preceding card's deck
 * count — if even that is below the minimum, the window is too thin to compare, so
 * the delta is suppressed (see rankTrendingCards' MIN_PREV_DECKS guard).
 */
export function useTrendingCards(
  format: FormatCode,
  metaWindow: WindowCode,
  filters: TrendingFilters = {},
): TrendingState {
  const eventId = filters.eventId ?? null
  // Stable dependency for the name array: serialize so a new array identity with
  // the same contents doesn't re-run, and reconstruct inside the effect (names
  // contain spaces, so a naive join/split would corrupt them).
  const namesKey = filters.archetypeNames ? JSON.stringify(filters.archetypeNames) : null
  const [state, setState] = useState<TrendingState>({ ...EMPTY, loading: true })

  useEffect(() => {
    let active = true
    setState({ ...EMPTY, loading: true })

    const archetypeNames = namesKey ? (JSON.parse(namesKey) as string[]) : null
    const now = new Date()
    const n = WINDOW_DAYS[metaWindow]
    const selectedStart = windowStartISO(metaWindow, now) // now - n
    const todayExclusive = isoOffset(now, -1) // tomorrow, so today's events are included
    const precedingStart = isoOffset(now, 2 * n)

    async function run() {
      const archetypeIds =
        archetypeNames === null
          ? null
          : archetypeNames.length === 0
            ? []
            : await resolveArchetypeIds(format, archetypeNames)

      // The three slice queries are independent once ids are resolved - run them
      // together. No meaningful preceding period under an event filter, so skip it.
      const [mainCurrent, sideCurrent, mainPrev] = await Promise.all([
        callTopCards(format, selectedStart, todayExclusive, 'main', archetypeIds, eventId),
        callTopCards(format, selectedStart, todayExclusive, 'side', archetypeIds, eventId),
        eventId !== null
          ? Promise.resolve(null)
          : callTopCards(format, precedingStart, selectedStart, 'main', archetypeIds, null),
      ])

      const prevDeckCount = mainPrev ? mainPrev.reduce((max, r) => Math.max(max, r.deckCount), 0) : 0

      return {
        trending: rankTrendingCards(mainCurrent, mainPrev, prevDeckCount),
        sideboard: rankTrendingCards(sideCurrent, null, 0),
      }
    }

    run()
      .then(({ trending, sideboard }) => {
        if (!active) return
        setState({ trending, sideboard, loading: false, error: null })
      })
      .catch((error) => {
        if (!active) return
        setState({ ...EMPTY, error })
      })

    return () => {
      active = false
    }
  }, [format, metaWindow, namesKey, eventId])

  return state
}
