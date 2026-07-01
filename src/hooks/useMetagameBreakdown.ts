import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FormatCode } from '../lib/formats'
import type { WindowCode } from '../lib/windows'

export interface ArchetypeShare {
  rank: number
  name: string
  colorIdentity: string
  sharePct: number
}

interface BreakdownRow {
  rank: number
  share_pct: number
  archetypes: { name: string; color_identity: string } | null
}

const TOP_N = 20

/**
 * Read the selected format + window's stored breakdown (top 20 archetypes by
 * rank) from Supabase. Returns loading/error/data; data is empty until loaded or
 * on error.
 */
export function useMetagameBreakdown(formatCode: FormatCode, metaWindow: WindowCode) {
  const [data, setData] = useState<ArchetypeShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('metagame_snapshots')
      .select('rank, share_pct, archetypes(name, color_identity)')
      .eq('format_code', formatCode)
      .eq('meta_window', metaWindow)
      .order('rank')
      .limit(TOP_N)
      .then(({ data: rows, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError)
          setData([])
        } else {
          setError(null)
          setData(
            // supabase-js types an embedded relation as an array even for a
            // to-one join; at runtime `archetypes` is a single object here.
            ((rows as unknown as BreakdownRow[] | null) ?? []).map((row) => ({
              rank: row.rank,
              name: row.archetypes?.name ?? '',
              colorIdentity: row.archetypes?.color_identity ?? '',
              sharePct: row.share_pct,
            })),
          )
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [formatCode, metaWindow])

  return { data, loading, error }
}
