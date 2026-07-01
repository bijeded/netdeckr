import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import type { WindowCode } from '../lib/windows'

/** Read the selected format + window's `last_updated_at` timestamp (or null). */
export function useLastUpdated(formatCode: FormatCode, metaWindow: WindowCode): string | null {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('format_window_freshness')
      .select('last_updated_at')
      .eq('format_code', formatCode)
      .eq('meta_window', metaWindow)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        setLastUpdated(error ? null : ((data?.last_updated_at as string | null) ?? null))
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow])

  return lastUpdated
}
