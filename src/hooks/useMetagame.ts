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
  events: { name: string; event_date: string | null; format_code: string } | null
}

export type DecksByArchetype = Record<string, DeckRow[]>

/**
 * The metagame for a format, derived from one fetch of the **2-week** corpus
 * (the selected window is a client-side date subset, since 2 weeks contains 5
 * days). The selected window's decks produce the ranked `breakdown` (share) and
 * the per-archetype `decksByArchetype` display decks — so every shown archetype
 * has decks and its name/share match its drill-down. Each archetype's **tier** is
 * its 2-week Power Score classified against the 2-week field (stable across the
 * window toggle), and its **trend** compares the selected window to that baseline
 * (null on the 2-week view). Returns loading/error and empty results until loaded.
 */
export function useMetagame(formatCode: FormatCode, metaWindow: WindowCode) {
  const [breakdown, setBreakdown] = useState<ArchetypeShare[]>([])
  const [decksByArchetype, setDecksByArchetype] = useState<DecksByArchetype>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('decks')
      .select(
        'id, source_deck_id, player, placement, archetypes(name, color_identity, art_image_url, art_crop_url), events!inner(name, event_date, format_code)',
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
          setLoading(false)
          return
        }
        setError(null)

        // The selected window is a date subset of the fetched 2-week corpus.
        const selectedStart = windowStartISO(metaWindow)

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

          if (eventDate >= selectedStart) {
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
        for (const [name, rowsForArchetype] of Object.entries(selectedGrouped)) {
          display[name] = selectDisplayDecks(rowsForArchetype)
        }

        setBreakdown(breakdown)
        setDecksByArchetype(display)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow])

  return { breakdown, decksByArchetype, loading, error }
}
