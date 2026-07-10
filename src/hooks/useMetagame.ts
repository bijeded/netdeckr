import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { windowStartISO, corpusFetchStartISO, type WindowCode } from '../lib/windows'
import { selectDisplayDecks, type DeckRow } from '../lib/deckSelection'
import { placementSortKey } from '../lib/placement'
import {
  deriveBreakdown,
  attachPowerTiers,
  type ArchetypeCardData,
  type DeckForBreakdown,
} from '../lib/metagame'
import { shareDeltas, type DeckForShareDelta } from '../lib/shareDelta'

/** The 2-week window anchors the stable tier baseline; the selected window is a date subset of it. */
const BASELINE_WINDOW: WindowCode = '2weeks'

function pushToMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key)
  if (arr) arr.push(value)
  else map.set(key, [value])
}

interface DeckQueryRow {
  id: number
  source_deck_id: string
  player: string
  placement: string
  archetypes: {
    name: string
    color_identity: string
    art_image_url: string | null
    art_crop_url: string | null
  } | null
  events: {
    id: number
    name: string
    event_date: string | null
    format_code: string
    player_count: number | null
  } | null
}

export type DecksByArchetype = Record<string, DeckRow[]>

/** A tournament event present in the window corpus, for the Event filter options. */
export interface EventOption {
  id: number
  name: string
  eventDate: string
  /** Tournament size (player_count); null when MTGTop8 didn't report it. */
  playerCount: number | null
}

/** Optional client-side view filters applied over the fetched corpus. */
export interface MetagameFilters {
  /** Restrict the breakdown/decks to a single event; null = all events. */
  eventId?: number | null
}

/** Aggregate counts over the displayed corpus, for the header StatCard strip. */
export interface MetagameTotals {
  events: number
  archetypes: number
  decks: number
}

const EMPTY_TOTALS: MetagameTotals = { events: 0, archetypes: 0, decks: 0 }

/**
 * The metagame for a format, derived from one fetch of a **28-day** corpus (two
 * 2-week windows). The 2-week tier baseline and the selected window are date
 * subsets of it; the extra 14 days feed only the preceding slice of each
 * archetype's week-over-week `shareDelta`. The selected window's decks produce
 * the ranked `breakdown` (share) and
 * the per-archetype `decksByArchetype` display decks — so every shown archetype
 * has decks and its name/share match its drill-down. Each archetype's **tier** is
 * its 2-week Power Score classified against the 2-week field (stable across the
 * window toggle), and its **trend** compares the selected window to that baseline
 * (null on the 2-week view). Returns loading/error and empty results until loaded.
 *
 * An optional `eventId` filter narrows the breakdown/decks to a single event, so
 * each archetype's share is recomputed **within that event**; tiers/trends stay
 * anchored to the full 2-week corpus. `events` lists the window corpus's distinct
 * events (Event filter options, unaffected by the filter). `fullDecksByArchetype`
 * is the uncapped, date-desc deck list used by an isolated, auto-expanded card.
 */
export function useMetagame(
  formatCode: FormatCode,
  metaWindow: WindowCode,
  filters: MetagameFilters = {},
) {
  const eventId = filters.eventId ?? null
  const [breakdown, setBreakdown] = useState<ArchetypeCardData[]>([])
  const [decksByArchetype, setDecksByArchetype] = useState<DecksByArchetype>({})
  const [fullDecksByArchetype, setFullDecksByArchetype] = useState<DecksByArchetype>({})
  const [events, setEvents] = useState<EventOption[]>([])
  const [totals, setTotals] = useState<MetagameTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('decks')
      .select(
        'id, source_deck_id, player, placement, archetypes(name, color_identity, art_image_url, art_crop_url), events!inner(id, name, event_date, format_code, player_count)',
      )
      .eq('events.format_code', formatCode)
      .gte('events.event_date', corpusFetchStartISO())
      .order('event_date', { referencedTable: 'events', ascending: false })
      .then(({ data: rows, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError)
          setBreakdown([])
          setDecksByArchetype({})
          setFullDecksByArchetype({})
          setEvents([])
          setTotals(EMPTY_TOTALS)
          setLoading(false)
          return
        }
        setError(null)

        // The fetched corpus spans 28 days (two 2-week windows). The 2-week tier
        // baseline and the selected window are date subsets of it; the extra 14
        // days feed only the preceding slice of the week-over-week share delta.
        const twoWeekStart = windowStartISO(BASELINE_WINDOW)
        const selectedStart = windowStartISO(metaWindow)

        // Distinct events present in the window corpus (before the event filter),
        // for the Event filter options — first occurrence wins, query is date-desc.
        const eventOptions: EventOption[] = []
        const seenEventIds = new Set<number>()

        // 2-week corpus: placements per archetype + breakdown input for the tier
        // reference field. Selected subset: display groups + breakdown input +
        // placements — all from the same rows so cards and drill-down never disagree.
        const twoWeekPlacements = new Map<string, string[]>()
        // Per-finish tournament sizes aligned with twoWeekPlacements (parallel push),
        // so the Power Score can weight each finish by its event's player count.
        const twoWeekSizes = new Map<string, (number | null)[]>()
        const twoWeekForBreakdown: DeckForBreakdown[] = []
        const selectedGrouped: Record<string, DeckRow[]> = {}
        const selectedForBreakdown: DeckForBreakdown[] = []
        const selectedPlacements = new Map<string, string[]>()
        // Distinct event ids in the filtered set, for the StatCard "Events" total.
        const selectedEventIds = new Set<number>()
        // The full 28-day corpus (event-unfiltered) feeding the share delta, which
        // slices it into the selected window and the preceding equal-length window.
        const deltaCorpus: DeckForShareDelta[] = []

        for (const row of (rows as unknown as DeckQueryRow[] | null) ?? []) {
          const archetypeName = row.archetypes?.name ?? ''
          if (!archetypeName) continue
          const colorIdentity = row.archetypes?.color_identity ?? ''
          const artImageUrl = row.archetypes?.art_image_url ?? null
          const artCropUrl = row.archetypes?.art_crop_url ?? null
          const placement = row.placement
          const eventDate = row.events?.event_date ?? ''
          const playerCount = row.events?.player_count ?? null

          // The share delta compares periods over the whole 28-day corpus, so it
          // takes every fetched deck regardless of the selected window or event.
          // Push the raw `?? null` (not the `''`-coerced `eventDate` local) so
          // `shareDeltas` can drop truly date-less rows rather than misplace them.
          deltaCorpus.push({ archetypeName, eventDate: row.events?.event_date ?? null })

          // The tier baseline is the last 2 weeks only (a subset of the 28-day fetch).
          if (eventDate >= twoWeekStart) {
            pushToMap(twoWeekPlacements, archetypeName, placement)
            pushToMap(twoWeekSizes, archetypeName, playerCount)
            twoWeekForBreakdown.push({ archetypeName, colorIdentity, placement, artImageUrl, artCropUrl })
          }

          const inWindow = eventDate >= selectedStart
          // Event options come from the window corpus, independent of the event filter.
          if (inWindow) {
            const evtId = row.events?.id
            if (evtId != null && !seenEventIds.has(evtId)) {
              seenEventIds.add(evtId)
              eventOptions.push({ id: evtId, name: row.events?.name ?? '', eventDate, playerCount })
            }
          }

          // The breakdown/decks derive from the window corpus narrowed by the event
          // filter (so shares are recomputed within the selected event).
          const passesEvent = eventId === null || row.events?.id === eventId
          if (inWindow && passesEvent) {
            const deck: DeckRow = {
              id: row.id,
              sourceDeckId: row.source_deck_id,
              player: row.player,
              placement,
              eventName: row.events?.name ?? '',
              eventDate,
              archetypeName,
              colorIdentity,
            }
            ;(selectedGrouped[archetypeName] ??= []).push(deck)
            selectedForBreakdown.push({ archetypeName, colorIdentity, placement, artImageUrl, artCropUrl })
            pushToMap(selectedPlacements, archetypeName, placement)
            if (row.events?.id != null) selectedEventIds.add(row.events.id)
          }
        }

        const totals: MetagameTotals = {
          events: selectedEventIds.size,
          archetypes: Object.keys(selectedGrouped).length,
          decks: selectedForBreakdown.length,
        }

        // Tier reference field = the WHOLE 2-week corpus (uncapped), not a top
        // slice; the breakdown is likewise uncapped, so every archetype (including
        // those past the grid's display cap) is tiered and selectable in filters.
        const twoWeekFieldNames = deriveBreakdown(twoWeekForBreakdown).map((a) => a.name)
        const tiered = attachPowerTiers(deriveBreakdown(selectedForBreakdown), {
          twoWeekPlacements,
          twoWeekSizes,
          twoWeekFieldNames,
          selectedPlacements,
          isBaseline: metaWindow === BASELINE_WINDOW,
        })

        // Period-over-period share delta: selected window vs the immediately-
        // preceding equal-length window, over the event-unfiltered corpus. A null
        // map means the preceding slice is too thin — every card shows no delta.
        const deltaMap = shareDeltas(deltaCorpus, metaWindow)
        const breakdown: ArchetypeCardData[] = tiered.map((archetype) => ({
          ...archetype,
          shareDelta: deltaMap?.get(archetype.name) ?? null,
        }))

        const display: DecksByArchetype = {}
        const full: DecksByArchetype = {}
        for (const [name, rowsForArchetype] of Object.entries(selectedGrouped)) {
          display[name] = selectDisplayDecks(rowsForArchetype)
          // Full list for the auto-expanded / event-filtered card: uncapped, most-
          // recent-first, with best finish first within a date (so a single event's
          // decks read 1st → 2nd → Top 4 → …).
          full[name] = [...rowsForArchetype].sort(
            (a, b) =>
              b.eventDate.localeCompare(a.eventDate) ||
              placementSortKey(a.placement) - placementSortKey(b.placement),
          )
        }

        // Sort explicitly (not relying on the query order) so the options are
        // most-recent-first regardless of row order.
        eventOptions.sort((a, b) => b.eventDate.localeCompare(a.eventDate))

        setBreakdown(breakdown)
        setDecksByArchetype(display)
        setFullDecksByArchetype(full)
        setEvents(eventOptions)
        setTotals(totals)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow, eventId])

  return { breakdown, decksByArchetype, fullDecksByArchetype, events, totals, loading, error }
}
