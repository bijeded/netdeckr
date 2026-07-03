import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { windowStartISO, type WindowCode } from '../lib/windows'
import { selectDisplayDecks, type DeckRow } from '../lib/deckSelection'
import { deriveBreakdown, type ArchetypeShare, type DeckForBreakdown } from '../lib/metagame'

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
 * The metagame for a format within the selected window, derived from one fetch of
 * the window's decks (decks are stored by event date). The same rows produce both
 * the ranked archetype `breakdown` (deck count per archetype → share) and the
 * per-archetype `decksByArchetype` display decks — so every shown archetype has
 * decks and the card's name/share always match its drill-down. Returns
 * loading/error and empty results until loaded or on error.
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
      .gte('events.event_date', windowStartISO(metaWindow))
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

        // Build the display groups (DeckRow) and the breakdown input from the same
        // rows so the cards and the drill-down can never disagree.
        const grouped: Record<string, DeckRow[]> = {}
        const forBreakdown: DeckForBreakdown[] = []
        for (const row of (rows as unknown as DeckQueryRow[] | null) ?? []) {
          const archetypeName = row.archetypes?.name ?? ''
          if (!archetypeName) continue
          const colorIdentity = row.archetypes?.color_identity ?? ''
          const deck: DeckRow = {
            id: row.id,
            sourceDeckId: row.source_deck_id,
            player: row.player,
            placement: row.placement,
            eventName: row.events?.name ?? '',
            eventDate: row.events?.event_date ?? '',
            archetypeName,
            colorIdentity,
          }
          ;(grouped[archetypeName] ??= []).push(deck)
          forBreakdown.push({
            archetypeName,
            colorIdentity,
            artImageUrl: row.archetypes?.art_image_url ?? null,
            artCropUrl: row.archetypes?.art_crop_url ?? null,
          })
        }

        const display: DecksByArchetype = {}
        for (const [name, rowsForArchetype] of Object.entries(grouped)) {
          display[name] = selectDisplayDecks(rowsForArchetype)
        }

        setBreakdown(deriveBreakdown(forBreakdown))
        setDecksByArchetype(display)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow])

  return { breakdown, decksByArchetype, loading, error }
}
