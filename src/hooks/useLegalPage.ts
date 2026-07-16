import { useCallback, useEffect, useState } from 'react'

export const LEGAL_PAGES = ['how-it-works', 'privacy'] as const
export type LegalPageCode = (typeof LEGAL_PAGES)[number]

const CODES = LEGAL_PAGES as readonly string[]

function isLegalPageCode(value: unknown): value is LegalPageCode {
  return typeof value === 'string' && CODES.includes(value)
}

function readPageFromUrl(): LegalPageCode | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('page')
  return isLegalPageCode(value) ? value : null
}

/**
 * The active legal page, backed by the `?page=` URL param — the same read/write
 * pattern as useFormatSelection/useWindowSelection (`?f=`/`?w=`). Unlike those,
 * this hook uses pushState rather than replaceState: opening or leaving a legal
 * page is a distinct navigation the user expects the browser back button to
 * undo, whereas switching format/window stays on the same conceptual page.
 */
export function useLegalPage() {
  const [page, setPageState] = useState<LegalPageCode | null>(readPageFromUrl)

  useEffect(() => {
    const onPopState = () => setPageState(readPageFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setPage = useCallback((next: LegalPageCode | null) => {
    setPageState(next)
    const params = new URLSearchParams(window.location.search)
    if (next === null) {
      params.delete('page')
    } else {
      params.set('page', next)
    }
    window.history.pushState({}, '', `?${params.toString()}`)
  }, [])

  return { page, setPage }
}
