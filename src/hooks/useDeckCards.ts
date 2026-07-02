import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DeckCardLine {
  quantity: number
  name: string
}

interface DeckCardQueryRow {
  board: string
  quantity: number
  card_name: string
  scryfall_name?: string | null
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
      .select('board, quantity, card_name, scryfall_name')
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
          const line: DeckCardLine = { quantity: row.quantity, name: row.scryfall_name ?? row.card_name }
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
