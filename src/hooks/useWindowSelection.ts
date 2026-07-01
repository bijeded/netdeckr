import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_WINDOW, normalizeWindow, type WindowCode } from '../lib/windows'

function readWindowFromUrl(): WindowCode {
  if (typeof window === 'undefined') return DEFAULT_WINDOW
  return normalizeWindow(new URLSearchParams(window.location.search).get('w'))
}

/**
 * The active time window / scope, backed by the `?w=` URL param so the selection
 * survives a reload. Independent of the `?f=` format param (both are preserved).
 * Defaults to Last 2 Weeks when the param is missing or invalid, and stays in
 * sync with browser back/forward navigation.
 */
export function useWindowSelection() {
  const [window_, setWindowState] = useState<WindowCode>(readWindowFromUrl)

  useEffect(() => {
    const onPopState = () => setWindowState(readWindowFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setWindow = useCallback((next: WindowCode) => {
    const valid = normalizeWindow(next)
    setWindowState(valid)
    const params = new URLSearchParams(window.location.search)
    params.set('w', valid)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }, [])

  return { window: window_, setWindow }
}
