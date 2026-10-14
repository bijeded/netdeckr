import { useCallback, useEffect, useState } from 'react'

/** History-state marker on an entry pushed by `setArchetype(name, { push: true })`. */
const ENTRY_MARKER = 'archetypeEntry'

function isPushedArchetypeEntry(): boolean {
  const state: unknown = window.history.state
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[ENTRY_MARKER] === true
}

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
 *
 * `leaveArchetype` is the in-page Back: on an entry it pushed, it steps back
 * through history (so the browser's own Back never lands on a duplicate grid);
 * otherwise — a shared link, a sidebar selection — it clears the param in place.
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
      window.history.pushState({ [ENTRY_MARKER]: true }, '', url)
    } else {
      // Keep the entry's state, so a pushed entry stays recognizable after an
      // in-place change (e.g. picking another archetype from the sidebar).
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  const leaveArchetype = useCallback(() => {
    if (isPushedArchetypeEntry()) {
      window.history.back()
    } else {
      setArchetype(null)
    }
  }, [setArchetype])

  return { archetype, setArchetype, leaveArchetype }
}
