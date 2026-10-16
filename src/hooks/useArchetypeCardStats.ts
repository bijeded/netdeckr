import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'
import type { FormatCode } from '../lib/formats'
import type { CardStatRow } from '../lib/stockList'
import { windowStartISO } from '../lib/windows'

const DAY_MS = 24 * 60 * 60 * 1000

/** A raw row from the `archetype_card_stats` RPC. */
interface CardStatQueryRow {
  board: string
  card_name: string
  scraped_name: string
  deck_ids: number[]
  quantities: number[]
  type_line: string | null
  cmc: number | string | null
  rarity: string | null
  set_code: string | null
  collector_number: string | null
  image_url: string | null
  small_image_url: string | null
}

export interface ArchetypeCardStatsState {
  rows: CardStatRow[]
  loading: boolean
  error: unknown
}

const IDLE: ArchetypeCardStatsState = { rows: [], loading: false, error: null }

function toRow(row: CardStatQueryRow): CardStatRow {
  return {
    board: row.board === 'side' ? 'side' : 'main',
    name: row.card_name,
    scrapedName: row.scraped_name ?? row.card_name,
    deckIds: row.deck_ids ?? [],
    quantities: row.quantities ?? [],
    typeLine: row.type_line ?? null,
    // PostgREST serialises `numeric` as a number or a string depending on settings.
    cmc: row.cmc === null || row.cmc === undefined ? null : Number(row.cmc),
    rarity: row.rarity ?? null,
    setCode: row.set_code ?? null,
    collectorNumber: row.collector_number ?? null,
    imageUrl: row.image_url ?? null,
    thumbnailUrl: row.small_image_url ?? row.image_url ?? null,
  }
}

/**
 * Per-card aggregate of one archetype's decks over the format's Last 2 Weeks,
 * for the Analysis tab's stock list and composition sections. Pass a null
 * `archetypeId` to skip the query. A response for a previous archetype or
 * format is discarded.
 */
export function useArchetypeCardStats(format: FormatCode, archetypeId: number | null): ArchetypeCardStatsState {
  const [state, setState] = useState<ArchetypeCardStatsState>(IDLE)

  useEffect(() => {
    if (archetypeId === null) {
      setState(IDLE)
      return
    }
    let active = true
    setState({ rows: [], loading: true, error: null })

    const now = new Date()
    supabase
      .rpc('archetype_card_stats', {
        p_format: format,
        p_archetype_id: archetypeId,
        p_start: windowStartISO('2weeks', now),
        // Exclusive bound: tomorrow, so today's events are included.
        p_end: new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10),
      })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          captureError(error, { tags: { feature: 'archetype-analysis', rpc: 'archetype_card_stats', format } })
          setState({ rows: [], loading: false, error })
          return
        }
        setState({ rows: ((data as CardStatQueryRow[] | null) ?? []).map(toRow), loading: false, error: null })
      })

    return () => {
      active = false
    }
  }, [format, archetypeId])

  return state
}
