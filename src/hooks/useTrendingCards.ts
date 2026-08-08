import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { windowStartISO, type WindowCode } from '../lib/windows'
import {
  rankTrendingCards,
  partitionByCategory,
  type CardCategory,
  type TopCardRow,
  type TrendingCard,
} from '../lib/trendingCards'

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
  category: CardCategory
  image_url: string | null
}

const toRows = (data: TopCardQueryRow[] | null): TopCardRow[] =>
  (data ?? []).map((row) => ({
    cardName: row.card_name,
    totalCopies: row.total_copies,
    deckCount: row.deck_count,
    category: row.category,
    imageUrl: row.image_url,
  }))

/** Optional view filters, mirroring the sidebar. Undefined/null = unfiltered. */
export interface TrendingFilters {
  /** Restrict to these archetypes (an archetype or tier selection). null/omitted = all. */
  archetypeNames?: string[] | null
  /** Restrict to a single event. null/omitted = all. */
  eventId?: number | null
  /**
   * Restrict to a set of events — the event-size filter, already resolved to ids
   * by the caller. null/omitted = all. An **empty array** means the selected size
   * class matched no event and must yield empty tables, which is why this is not
   * collapsed to null when empty.
   */
  eventIds?: number[] | null
}

interface TrendingState {
  /** Top mainboard creatures, ranked by total copies. */
  creatures: TrendingCard[]
  /** Top mainboard non-land, non-creature spells, ranked by total copies. */
  spells: TrendingCard[]
  /** Top sideboard cards, ranked by total copies. */
  sideboard: TrendingCard[]
  loading: boolean
  error: unknown
}

const EMPTY: TrendingState = { creatures: [], spells: [], sideboard: [], loading: false, error: null }

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
  eventIds: number[] | null,
): Promise<TopCardRow[]> {
  const { data, error } = await supabase.rpc('top_cards', {
    p_format: format,
    p_start: start,
    p_end: end,
    p_board: board,
    p_archetype_ids: archetypeIds,
    p_event_id: eventId,
    p_event_ids: eventIds,
  })
  if (error) throw error
  return toRows(data as TopCardQueryRow[] | null)
}

/**
 * The trending-cards tables for a format + time frame: Trending Creatures and
 * Trending Spells (the mainboard split by card category) plus the Top Sideboard
 * Cards list, each ranked by total copies (with an average-copies-per-deck
 * value). Derives from the `top_cards` RPC — one call per board, the mainboard
 * rows partitioned by category — so the browser never pulls raw deck_cards;
 * lands are excluded server-side.
 *
 * Filters mirror the sidebar: `archetypeNames` (an archetype or tier selection)
 * narrows both calls via resolved ids; `eventId` narrows them to a single event;
 * `eventIds` narrows them to the events of the selected size class. The size
 * bands themselves are never sent — the caller resolves them to ids, so the
 * thresholds stay in one place and the aggregation stays generic.
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
  // Same identity problem for the event ids, and the same fix. `?? null` rather
  // than a truthiness check: an empty array is a meaningful value here (a size
  // class with no events), not the absence of a filter.
  const eventIdsKey = filters.eventIds != null ? JSON.stringify(filters.eventIds) : null
  const [state, setState] = useState<TrendingState>({ ...EMPTY, loading: true })

  useEffect(() => {
    let active = true
    setState({ ...EMPTY, loading: true })

    const archetypeNames = namesKey ? (JSON.parse(namesKey) as string[]) : null
    const eventIds = eventIdsKey !== null ? (JSON.parse(eventIdsKey) as number[]) : null
    const now = new Date()
    const start = windowStartISO(metaWindow, now) // now - n
    const end = isoOffset(now, -1) // tomorrow, so today's events are included

    async function run() {
      const archetypeIds =
        archetypeNames === null
          ? null
          : archetypeNames.length === 0
            ? []
            : await resolveArchetypeIds(format, archetypeNames)

      const [main, side] = await Promise.all([
        callTopCards(format, start, end, 'main', archetypeIds, eventId, eventIds),
        callTopCards(format, start, end, 'side', archetypeIds, eventId, eventIds),
      ])

      const { creatures, spells } = partitionByCategory(main)
      return {
        creatures: rankTrendingCards(creatures),
        spells: rankTrendingCards(spells),
        sideboard: rankTrendingCards(side),
      }
    }

    run()
      .then(({ creatures, spells, sideboard }) => {
        if (!active) return
        setState({ creatures, spells, sideboard, loading: false, error: null })
      })
      .catch((error) => {
        if (!active) return
        setState({ ...EMPTY, error })
      })

    return () => {
      active = false
    }
  }, [format, metaWindow, namesKey, eventId, eventIdsKey])

  return state
}
