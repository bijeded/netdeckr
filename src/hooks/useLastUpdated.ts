import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'

/**
 * Read the selected format's `last_updated_at` timestamp (or null). Freshness is
 * per-format: the scraper stamps it after a successful run, and the metagame is
 * derived from that format's decks regardless of window, so there is no per-window
 * timestamp. Returns null when absent or on error (the indicator is then hidden).
 */
export function useLastUpdated(formatCode: FormatCode): string | null {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('formats')
      .select('last_updated_at')
      .eq('code', formatCode)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        setLastUpdated(error ? null : ((data?.last_updated_at as string | null) ?? null))
      })

    return () => {
      active = false
    }
  }, [formatCode])

  return lastUpdated
}
