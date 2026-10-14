import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'
import type { FormatCode } from '../lib/formats'
import { precedingWindowStartISO, windowStartISO, type WindowCode } from '../lib/windows'
import {
  hasNewCardsTable,
  rankTrendingCards,
  partitionByCategory,
  type CardCategory,
  type RankableCardRow,
  type RecentSetCardRow,
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

/**
 * A raw row from the `recent_set_top_cards` RPC. The RPC also returns `set_code`,
 * which the tables no longer display, so it is not read.
 */
interface RecentSetCardQueryRow {
  card_name: string
  total_copies: number
  deck_count: number
  image_url: string | null
}

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

/**
 * Legal decks in the trending slice for the selected and the preceding window —
 * the play-rate denominators, computed by the caller from the metagame corpus
 * (`sliceDeckTotal`). Null while unknown: play rates and trends then stay blank.
 */
export interface TrendingSliceTotals {
  selected: number
  preceding: number
}

/** The fetched rows, kept raw so a change of slice totals re-derives without a refetch. */
interface RawTrending {
  main: TopCardRow[]
  side: TopCardRow[]
  recent: RecentSetCardRow[]
  /** Preceding-window rows per table; null when skipped (event filter) or failed. */
  prevMain: TopCardRow[] | null
  prevSide: TopCardRow[] | null
  prevRecent: RecentSetCardRow[] | null
}

const EMPTY_RAW: RawTrending = {
  main: [],
  side: [],
  recent: [],
  prevMain: null,
  prevSide: null,
  prevRecent: null,
}

interface TrendingState {
  /** Top mainboard creatures, ranked by total copies. */
  creatures: TrendingCard[]
  /** Top mainboard non-land, non-creature spells, ranked by total copies. */
  spells: TrendingCard[]
  /** Top sideboard cards, ranked by total copies. */
  sideboard: TrendingCard[]
  /**
   * Top cards printed in the two most recent main sets, both boards combined,
   * ranked by total copies. Always empty in Pre-Modern (no call is made).
   */
  newCards: TrendingCard[]
  loading: boolean
  error: unknown
  /**
   * A failure of the Top New Cards call alone. Kept apart from `error` so it
   * empties only that table: the other three come from a different RPC and
   * still render.
   */
  newCardsError: unknown
}

interface FetchState {
  raw: RawTrending
  loading: boolean
  error: unknown
  newCardsError: unknown
}

const EMPTY_FETCH: FetchState = { raw: EMPTY_RAW, loading: false, error: null, newCardsError: null }

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

/** One call to the recent_set_top_cards RPC (same slice params, no board). */
async function callRecentSetTopCards(
  format: FormatCode,
  start: string,
  end: string,
  archetypeIds: number[] | null,
  eventId: number | null,
  eventIds: number[] | null,
): Promise<RecentSetCardRow[]> {
  const { data, error } = await supabase.rpc('recent_set_top_cards', {
    p_format: format,
    p_start: start,
    p_end: end,
    p_archetype_ids: archetypeIds,
    p_event_id: eventId,
    p_event_ids: eventIds,
  })
  if (error) throw error
  return ((data as RecentSetCardQueryRow[] | null) ?? []).map((row) => ({
    cardName: row.card_name,
    totalCopies: row.total_copies,
    deckCount: row.deck_count,
    imageUrl: row.image_url,
  }))
}

/**
 * Resolve a preceding-window fetch to its rows, or null on failure (blanks the
 * trend only). The failure is still handed to `onError`, so it gets reported.
 */
function orNull<T>(promise: Promise<T>, onError: (e: unknown) => void): Promise<T | null> {
  return promise.catch((e: unknown) => {
    onError(e)
    return null
  })
}

/**
 * The trending-cards tables for a format + time frame: Trending Creatures and
 * Trending Spells (the mainboard split by card category) plus the Top Sideboard
 * Cards list, each ranked by total copies (with an average-copies-per-deck
 * value). Derives from the `top_cards` RPC — one call per board, the mainboard
 * rows partitioned by category — so the browser never pulls raw deck_cards;
 * lands are excluded server-side. Top New Cards is a third call, to
 * `recent_set_top_cards`, with the same slice (skipped in Pre-Modern).
 *
 * Filters mirror the sidebar: `archetypeNames` (an archetype or tier selection)
 * narrows both calls via resolved ids; `eventId` narrows them to a single event;
 * `eventIds` narrows them to the events of the selected size class. The size
 * bands themselves are never sent — the caller resolves them to ids, so the
 * thresholds stay in one place and the aggregation stays generic.
 *
 * Each call is repeated over the immediately-preceding window of equal length,
 * `[now−2N, now−N)`, for the play-rate trend. Those calls are skipped under an
 * event filter (that event has no decks there), and a failure of one only blanks
 * its table's trends. `sliceTotals` are the play-rate denominators; the ranked
 * tables are derived from the raw rows in a memo, so a change of totals never
 * refetches.
 */
export function useTrendingCards(
  format: FormatCode,
  metaWindow: WindowCode,
  filters: TrendingFilters = {},
  sliceTotals: TrendingSliceTotals | null = null,
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
  const [state, setState] = useState<FetchState>({ ...EMPTY_FETCH, loading: true })

  useEffect(() => {
    let active = true
    setState({ ...EMPTY_FETCH, loading: true })

    const archetypeNames = namesKey ? (JSON.parse(namesKey) as string[]) : null
    const eventIds = eventIdsKey !== null ? (JSON.parse(eventIdsKey) as number[]) : null
    const now = new Date()
    const start = windowStartISO(metaWindow, now) // now - n
    const end = isoOffset(now, -1) // tomorrow, so today's events are included
    // The preceding window ends where the selected one starts (exclusive bound).
    const prevStart = precedingWindowStartISO(metaWindow, now)
    const withNewCards = hasNewCardsTable(format)
    const withPreceding = eventId === null
    // Every failed call is reported to Sentry, including the ones whose failure
    // only blanks a table or a trend: a timeout must never pass as "no data".
    const report = (rpc: string, slice: 'selected' | 'preceding') => (e: unknown) =>
      captureError(e, { tags: { feature: 'trending', rpc, slice, format, window: metaWindow } })

    async function run() {
      const archetypeIds =
        archetypeNames === null
          ? null
          : archetypeNames.length === 0
            ? []
            : await resolveArchetypeIds(format, archetypeNames)

      // The Top New Cards call settles on its own: its failure becomes
      // `newCardsError` and an empty table rather than rejecting the whole set.
      let newCardsError: unknown = null
      const skipped = Promise.resolve(null)
      const [main, side, recent, prevMain, prevSide, prevRecent] = await Promise.all([
        callTopCards(format, start, end, 'main', archetypeIds, eventId, eventIds),
        callTopCards(format, start, end, 'side', archetypeIds, eventId, eventIds),
        withNewCards
          ? callRecentSetTopCards(format, start, end, archetypeIds, eventId, eventIds).catch((e: unknown) => {
              newCardsError = e
              report('recent_set_top_cards', 'selected')(e)
              return []
            })
          : Promise.resolve([]),
        withPreceding
          ? orNull(
              callTopCards(format, prevStart, start, 'main', archetypeIds, eventId, eventIds),
              report('top_cards', 'preceding'),
            )
          : skipped,
        withPreceding
          ? orNull(
              callTopCards(format, prevStart, start, 'side', archetypeIds, eventId, eventIds),
              report('top_cards', 'preceding'),
            )
          : skipped,
        withPreceding && withNewCards
          ? orNull(
              callRecentSetTopCards(format, prevStart, start, archetypeIds, eventId, eventIds),
              report('recent_set_top_cards', 'preceding'),
            )
          : skipped,
      ])

      const raw: RawTrending = { main, side, recent, prevMain, prevSide, prevRecent }
      return { raw, newCardsError }
    }

    run()
      .then(({ raw, newCardsError }) => {
        if (!active) return
        setState({ raw, newCardsError, loading: false, error: null })
      })
      .catch((error) => {
        // One report per failed load: main and side share this rejection (the
        // first failure wins), as does a failed archetype-id resolution.
        report('top_cards', 'selected')(error)
        if (!active) return
        setState({ ...EMPTY_FETCH, error })
      })

    return () => {
      active = false
    }
  }, [format, metaWindow, namesKey, eventId, eventIdsKey])

  const selectedTotal = sliceTotals?.selected ?? 0
  const precedingTotal = sliceTotals?.preceding ?? 0
  const tables = useMemo(() => {
    const { raw } = state
    const context = (precedingRows: RankableCardRow[] | null) => ({
      selectedTotal,
      precedingTotal,
      precedingRows,
    })
    const { creatures, spells } = partitionByCategory(raw.main)
    // Card names are unique within a board, so the whole preceding mainboard can
    // serve as the lookup for both of its tables.
    return {
      creatures: rankTrendingCards(creatures, context(raw.prevMain)),
      spells: rankTrendingCards(spells, context(raw.prevMain)),
      sideboard: rankTrendingCards(raw.side, context(raw.prevSide)),
      newCards: rankTrendingCards(raw.recent, context(raw.prevRecent)),
    }
  }, [state, selectedTotal, precedingTotal])

  return {
    ...tables,
    loading: state.loading,
    error: state.error,
    newCardsError: state.newCardsError,
  }
}
