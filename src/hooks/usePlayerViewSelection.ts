import { useCallback, useEffect, useState } from 'react'

/** History-state marker on an entry pushed by `openPlayers`/`openPlayer` with `{ push: true }`. */
const ENTRY_MARKER = 'playerViewEntry'

/** The one recognized `?v=` value. */
const PLAYERS_VIEW = 'players'

export interface PlayerViewState {
  /** True while the Players view (or a Player view inside it) is open. */
  open: boolean
  /** The Player view's player as written in the URL, or null for the rankings. */
  player: string | null
}

function isPushedEntry(): boolean {
  const state: unknown = window.history.state
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[ENTRY_MARKER] === true
}

function readFromUrl(): PlayerViewState {
  if (typeof window === 'undefined') return { open: false, player: null }
  const params = new URLSearchParams(window.location.search)
  if (params.get('v') !== PLAYERS_VIEW) return { open: false, player: null }
  const player = params.get('p')
  return { open: true, player: player === null || player === '' ? null : player }
}

function writeUrl(params: URLSearchParams, push: boolean) {
  const query = params.toString()
  const url = query ? `?${query}` : window.location.pathname
  if (push) window.history.pushState({ [ENTRY_MARKER]: true }, '', url)
  // Keep the entry's state, so a pushed entry stays recognizable after an
  // in-place change.
  else window.history.replaceState(window.history.state, '', url)
}

/**
 * The Players view and the Player view inside it, backed by `?v=players` and
 * `?p=<name>` so either can be reloaded and shared — the same pattern as
 * useArchetypeSelection, alongside `?f=`/`?w=`/`?a=`, which every write keeps.
 * The name is not validated here: the Player view resolves it case-insensitively
 * against the loaded data and shows an empty state when it matches nobody.
 *
 * `{ push: true }` adds a history entry, for navigation into a view, so the
 * browser Back button undoes it. `leave` is the in-page Back, one level at a
 * time (Player view → rankings → dashboard): on an entry it pushed it steps back
 * through history, otherwise — a shared link — it clears in place.
 */
export function usePlayerViewSelection() {
  const [state, setState] = useState<PlayerViewState>(readFromUrl)

  // An unrecognized `?v=`, or a `?p=` outside the Players view, is dropped on
  // load so the URL never claims a view that isn't shown.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('v') === PLAYERS_VIEW || (!params.has('v') && !params.has('p'))) return
    params.delete('v')
    params.delete('p')
    writeUrl(params, false)
  }, [])

  useEffect(() => {
    const onPopState = () => setState(readFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const apply = useCallback((next: PlayerViewState, push: boolean) => {
    setState(next)
    const params = new URLSearchParams(window.location.search)
    const before = params.toString()
    if (next.open) params.set('v', PLAYERS_VIEW)
    else params.delete('v')
    if (next.player !== null) params.set('p', next.player)
    else params.delete('p')
    if (params.toString() === before) return
    writeUrl(params, push)
  }, [])

  const openPlayers = useCallback(
    (options: { push?: boolean } = {}) => apply({ open: true, player: null }, options.push ?? false),
    [apply],
  )
  const openPlayer = useCallback(
    (name: string, options: { push?: boolean } = {}) =>
      apply({ open: true, player: name }, options.push ?? false),
    [apply],
  )
  /** Back to the rankings in place (e.g. on a format switch), keeping the view open. */
  const clearPlayer = useCallback(() => {
    if (state.player !== null) apply({ open: true, player: null }, false)
  }, [apply, state.player])

  const leave = useCallback(() => {
    if (isPushedEntry()) {
      window.history.back()
      return
    }
    apply(state.player !== null ? { open: true, player: null } : { open: false, player: null }, false)
  }, [apply, state.player])

  return { ...state, openPlayers, openPlayer, clearPlayer, leave }
}
