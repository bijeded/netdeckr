import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DeckCardLine {
  quantity: number
  name: string
  /** Canonical non-foil printing, when Scryfall mapping has populated it. */
  setCode?: string | null
  collectorNumber?: string | null
  /** Hotlinked Scryfall card image (normal size), when resolved; else null. */
  imageUrl?: string | null
  /**
   * Thumbnail-size image for the decklist modal's image-view tiles. Falls back to
   * the normal image while `small_image_url` is still unpopulated (rows enriched
   * before that column existed, until the backfill runs) — heavier but correct,
   * so tiles never degrade to a placeholder over backfill timing alone.
   */
  thumbnailUrl?: string | null
  /** Scryfall type line (e.g. "Creature — Elf Druid"), when resolved; else null. */
  typeLine?: string | null
}

interface DeckCardQueryRow {
  board: string
  quantity: number
  card_name: string
  scryfall_name?: string | null
  set_code?: string | null
  collector_number?: string | null
  image_url?: string | null
  small_image_url?: string | null
  type_line?: string | null
}

interface DeckCardsState {
  main: DeckCardLine[]
  side: DeckCardLine[]
  mainCount: number
  sideCount: number
  loading: boolean
  error: unknown
}

const EMPTY: DeckCardsState = { main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: null }

const sum = (lines: DeckCardLine[]) => lines.reduce((total, line) => total + line.quantity, 0)

/**
 * Read a deck's cards (main + sideboard) for the decklist modal. Pass `null` when
 * no deck is open — no query runs. Card names prefer the Scryfall canonical name
 * once populated (a later change), falling back to the scraped name.
 */
export function useDeckCards(deckId: number | null): DeckCardsState {
  const [state, setState] = useState<DeckCardsState>(EMPTY)

  useEffect(() => {
    if (deckId == null) {
      setState(EMPTY)
      return
    }

    let active = true
    setState({ ...EMPTY, loading: true })

    supabase
      .from('deck_cards')
      .select(
        'board, quantity, card_name, scryfall_name, set_code, collector_number, image_url, small_image_url, type_line',
      )
      .eq('deck_id', deckId)
      .order('id')
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setState({ ...EMPTY, error })
          return
        }
        const main: DeckCardLine[] = []
        const side: DeckCardLine[] = []
        for (const row of (data as unknown as DeckCardQueryRow[] | null) ?? []) {
          const line: DeckCardLine = {
            quantity: row.quantity,
            name: row.scryfall_name ?? row.card_name,
            setCode: row.set_code ?? null,
            collectorNumber: row.collector_number ?? null,
            imageUrl: row.image_url ?? null,
            thumbnailUrl: row.small_image_url ?? row.image_url ?? null,
            typeLine: row.type_line ?? null,
          }
          ;(row.board === 'side' ? side : main).push(line)
        }
        setState({ main, side, mainCount: sum(main), sideCount: sum(side), loading: false, error: null })
      })

    return () => {
      active = false
    }
  }, [deckId])

  return state
}
