import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_FORMAT, normalizeFormat, type FormatCode } from '../lib/formats'

function readFormatFromUrl(): FormatCode {
  if (typeof window === 'undefined') return DEFAULT_FORMAT
  return normalizeFormat(new URLSearchParams(window.location.search).get('f'))
}

/**
 * The active format, backed by the `?f=` URL param so the selection survives a
 * reload. Defaults to Standard when the param is missing or invalid, and stays
 * in sync with browser back/forward navigation.
 */
export function useFormatSelection() {
  const [format, setFormatState] = useState<FormatCode>(readFormatFromUrl)

  useEffect(() => {
    const onPopState = () => setFormatState(readFormatFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setFormat = useCallback((next: FormatCode) => {
    const valid = normalizeFormat(next)
    setFormatState(valid)
    const params = new URLSearchParams(window.location.search)
    params.set('f', valid)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }, [])

  return { format, setFormat }
}
