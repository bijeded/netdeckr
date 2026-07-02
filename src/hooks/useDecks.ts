import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import { windowStartISO, type WindowCode } from '../lib/windows'
import { selectDisplayDecks, type DeckRow } from '../lib/deckSelection'

interface DeckQueryRow {
  id: number
  source_deck_id: string
  player: string
  placement: string
  archetypes: { name: string; color_identity: string } | null
  events: { name: string; event_date: string | null } | null
}

export type DecksByArchetype = Record<string, DeckRow[]>

/**
 * Read the decks for a format within the selected window's time frame (decks are
 * stored by event date, not window), grouped by archetype name and reduced per
 * archetype to the decks to display (Top 4 finishes, else the latest 4 by date).
 * Returns loading/error and an empty map until loaded or on error.
 */
export function useDecks(formatCode: FormatCode, metaWindow: WindowCode) {
  const [decksByArchetype, setDecksByArchetype] = useState<DecksByArchetype>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('decks')
      .select('id, source_deck_id, player, placement, archetypes(name, color_identity), events!inner(name, event_date, format_code)')
      .eq('events.format_code', formatCode)
      .gte('events.event_date', windowStartISO(metaWindow))
      .order('event_date', { referencedTable: 'events', ascending: false })
      .then(({ data: rows, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError)
          setDecksByArchetype({})
          setLoading(false)
          return
        }
        setError(null)

        // Group raw rows by archetype name, then apply the display rule per group.
        const grouped: Record<string, DeckRow[]> = {}
        for (const row of (rows as unknown as DeckQueryRow[] | null) ?? []) {
          const archetypeName = row.archetypes?.name ?? ''
          if (!archetypeName) continue
          const deck: DeckRow = {
            id: row.id,
            sourceDeckId: row.source_deck_id,
            player: row.player,
            placement: row.placement,
            eventName: row.events?.name ?? '',
            eventDate: row.events?.event_date ?? '',
            archetypeName,
            colorIdentity: row.archetypes?.color_identity ?? '',
          }
          ;(grouped[archetypeName] ??= []).push(deck)
        }

        const display: DecksByArchetype = {}
        for (const [name, rowsForArchetype] of Object.entries(grouped)) {
          display[name] = selectDisplayDecks(rowsForArchetype)
        }
        setDecksByArchetype(display)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow])

  return { decksByArchetype, loading, error }
}
