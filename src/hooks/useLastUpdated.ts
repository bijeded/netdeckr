import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'

/** Read the selected format's `last_updated_at` timestamp (or null). */
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
