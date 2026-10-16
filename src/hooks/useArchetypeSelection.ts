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

/** The isolated archetype view's two tabs. Lists is the absence of `tab`. */
export type ArchetypeTab = 'lists' | 'analysis'

const TAB_PARAM = 'tab'
const ANALYSIS: ArchetypeTab = 'analysis'

function readTabFromUrl(): ArchetypeTab {
  if (typeof window === 'undefined') return 'lists'
  const params = new URLSearchParams(window.location.search)
  return params.get(TAB_PARAM) === ANALYSIS && readArchetypeFromUrl() !== null ? ANALYSIS : 'lists'
}

function urlFor(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `?${query}` : window.location.pathname
}

/** Drop a `tab` param that names no tab or has no archetype to belong to. */
function dropInvalidTabParam() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (!params.has(TAB_PARAM) || readTabFromUrl() === ANALYSIS) return
  params.delete(TAB_PARAM)
  window.history.replaceState(window.history.state, '', urlFor(params))
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
 *
 * `tab` is the isolated view's selected tab, persisted as `tab=analysis` (Lists
 * is its absence). Setting an archetype selects Lists unless `{ tab: 'analysis' }`
 * is passed; clearing the archetype removes `tab`. `setTab` replaces the entry,
 * so tab switches never stack history.
 */
interface SetArchetypeOptions {
  push?: boolean
  tab?: ArchetypeTab
}

export function useArchetypeSelection() {
  const [archetype, setArchetypeState] = useState<string | null>(readArchetypeFromUrl)
  const [tab, setTabState] = useState<ArchetypeTab>(readTabFromUrl)

  useEffect(() => {
    dropInvalidTabParam()
    const onPopState = () => {
      setArchetypeState(readArchetypeFromUrl())
      setTabState(readTabFromUrl())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setArchetype = useCallback((next: string | null, options: SetArchetypeOptions = {}) => {
    const nextTab: ArchetypeTab = next !== null && options.tab === ANALYSIS ? ANALYSIS : 'lists'
    setArchetypeState(next)
    setTabState(nextTab)
    const params = new URLSearchParams(window.location.search)
    const before = params.toString()
    if (next === null) params.delete('a')
    else params.set('a', next)
    if (nextTab === ANALYSIS) params.set(TAB_PARAM, ANALYSIS)
    else params.delete(TAB_PARAM)
    if (params.toString() === before) return
    const url = urlFor(params)
    if (options.push) {
      window.history.pushState({ [ENTRY_MARKER]: true }, '', url)
    } else {
      // Keep the entry's state, so a pushed entry stays recognizable after an
      // in-place change (e.g. picking another archetype from the sidebar).
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  const setTab = useCallback((next: ArchetypeTab) => {
    if (readArchetypeFromUrl() === null) return
    setTabState(next)
    const params = new URLSearchParams(window.location.search)
    if (next === ANALYSIS) params.set(TAB_PARAM, ANALYSIS)
    else params.delete(TAB_PARAM)
    window.history.replaceState(window.history.state, '', urlFor(params))
  }, [])

  const leaveArchetype = useCallback(() => {
    if (isPushedArchetypeEntry()) {
      window.history.back()
    } else {
      setArchetype(null)
    }
  }, [setArchetype])

  return { archetype, tab, setArchetype, setTab, leaveArchetype }
}
