import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { windowStartISO, type WindowCode } from '../lib/windows'
import { selectDisplayDecks, type DeckRow } from '../lib/deckSelection'
import {
  deriveBreakdown,
  attachPowerTiers,
  type ArchetypeShare,
  type DeckForBreakdown,
} from '../lib/metagame'

/** The 2-week window is the corpus we always fetch; the selected window is a date subset. */
const BASELINE_WINDOW: WindowCode = '2weeks'

function pushToMap(map: Map<string, string[]>, key: string, value: string) {
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
  events: { id: number; name: string; event_date: string | null; format_code: string } | null
}

export type DecksByArchetype = Record<string, DeckRow[]>

/** A tournament event present in the window corpus, for the Event filter options. */
export interface EventOption {
  id: number
  name: string
  eventDate: string
}

/** Optional client-side view filters applied over the fetched corpus. */
export interface MetagameFilters {
  /** Restrict the breakdown/decks to a single event; null = all events. */
  eventId?: number | null
}

/**
 * The metagame for a format, derived from one fetch of the **2-week** corpus
 * (the selected window is a client-side date subset, since 2 weeks contains 5
 * days). The selected window's decks produce the ranked `breakdown` (share) and
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
  const [breakdown, setBreakdown] = useState<ArchetypeShare[]>([])
  const [decksByArchetype, setDecksByArchetype] = useState<DecksByArchetype>({})
  const [fullDecksByArchetype, setFullDecksByArchetype] = useState<DecksByArchetype>({})
  const [events, setEvents] = useState<EventOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('decks')
      .select(
        'id, source_deck_id, player, placement, archetypes(name, color_identity, art_image_url, art_crop_url), events!inner(id, name, event_date, format_code)',
      )
      .eq('events.format_code', formatCode)
      .gte('events.event_date', windowStartISO(BASELINE_WINDOW))
      .order('event_date', { referencedTable: 'events', ascending: false })
      .then(({ data: rows, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError)
          setBreakdown([])
          setDecksByArchetype({})
          setFullDecksByArchetype({})
          setEvents([])
          setLoading(false)
          return
        }
        setError(null)

        // The selected window is a date subset of the fetched 2-week corpus.
        const selectedStart = windowStartISO(metaWindow)

        // Distinct events present in the window corpus (before the event filter),
        // for the Event filter options — first occurrence wins, query is date-desc.
        const eventOptions: EventOption[] = []
        const seenEventIds = new Set<number>()

        // 2-week corpus: placements per archetype + breakdown input for the tier
        // reference field. Selected subset: display groups + breakdown input +
        // placements — all from the same rows so cards and drill-down never disagree.
        const twoWeekPlacements = new Map<string, string[]>()
        const twoWeekForBreakdown: DeckForBreakdown[] = []
        const selectedGrouped: Record<string, DeckRow[]> = {}
        const selectedForBreakdown: DeckForBreakdown[] = []
        const selectedPlacements = new Map<string, string[]>()

        for (const row of (rows as unknown as DeckQueryRow[] | null) ?? []) {
          const archetypeName = row.archetypes?.name ?? ''
          if (!archetypeName) continue
          const colorIdentity = row.archetypes?.color_identity ?? ''
          const artImageUrl = row.archetypes?.art_image_url ?? null
          const artCropUrl = row.archetypes?.art_crop_url ?? null
          const placement = row.placement
          const eventDate = row.events?.event_date ?? ''

          pushToMap(twoWeekPlacements, archetypeName, placement)
          twoWeekForBreakdown.push({ archetypeName, colorIdentity, placement, artImageUrl, artCropUrl })

          const inWindow = eventDate >= selectedStart
          // Event options come from the window corpus, independent of the event filter.
          if (inWindow) {
            const evtId = row.events?.id
            if (evtId != null && !seenEventIds.has(evtId)) {
              seenEventIds.add(evtId)
              eventOptions.push({ id: evtId, name: row.events?.name ?? '', eventDate })
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
          }
        }

        const twoWeekTopNames = deriveBreakdown(twoWeekForBreakdown).map((a) => a.name)
        const breakdown = attachPowerTiers(deriveBreakdown(selectedForBreakdown), {
          twoWeekPlacements,
          twoWeekTopNames,
          selectedPlacements,
          isBaseline: metaWindow === BASELINE_WINDOW,
        })

        const display: DecksByArchetype = {}
        const full: DecksByArchetype = {}
        for (const [name, rowsForArchetype] of Object.entries(selectedGrouped)) {
          display[name] = selectDisplayDecks(rowsForArchetype)
          // Full list for the auto-expanded isolated card: uncapped, most-recent-first.
          full[name] = [...rowsForArchetype].sort((a, b) => b.eventDate.localeCompare(a.eventDate))
        }

        // Sort explicitly (not relying on the query order) so the options are
        // most-recent-first regardless of row order.
        eventOptions.sort((a, b) => b.eventDate.localeCompare(a.eventDate))

        setBreakdown(breakdown)
        setDecksByArchetype(display)
        setFullDecksByArchetype(full)
        setEvents(eventOptions)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow, eventId])

  return { breakdown, decksByArchetype, fullDecksByArchetype, events, loading, error }
}
