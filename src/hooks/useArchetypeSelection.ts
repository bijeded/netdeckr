import { useCallback, useEffect, useState } from 'react'

function readArchetypeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('a')
  return value === null || value === '' ? null : value
}

/**
 * The isolated archetype, backed by the `?a=` URL param so an archetype view can
 * be reloaded and shared — the same read/write pattern as useFormatSelection/
 * useLegalPage. The name is not validated here (the hook has no data); the
 * dashboard's auto-reset drops a name absent from the loaded breakdown.
 *
 * Writes replace the history entry by default, since adjusting a filter stays on
 * the same page. `{ push: true }` adds an entry instead, for entry points that
 * read as navigating *into* the archetype, so the browser Back button undoes them.
 */
export function useArchetypeSelection() {
  const [archetype, setArchetypeState] = useState<string | null>(readArchetypeFromUrl)

  useEffect(() => {
    const onPopState = () => setArchetypeState(readArchetypeFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setArchetype = useCallback((next: string | null, options: { push?: boolean } = {}) => {
    setArchetypeState(next)
    const params = new URLSearchParams(window.location.search)
    if (next === null) {
      if (!params.has('a')) return
      params.delete('a')
    } else {
      if (params.get('a') === next) return
      params.set('a', next)
    }
    const query = params.toString()
    const url = query ? `?${query}` : window.location.pathname
    if (options.push) {
      window.history.pushState({}, '', url)
    } else {
      window.history.replaceState({}, '', url)
    }
  }, [])

  return { archetype, setArchetype }
}
