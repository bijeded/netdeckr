import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SORT_ORDER, isSortOrder, type SortOrder } from '../lib/sortOrder'

const SORT_PARAM = 'sort'

function urlFor(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `?${query}` : window.location.pathname
}

/** Read `?sort=`, silently dropping a value that names no order (and so applying Popular). */
function readSortOrderFromUrl(): SortOrder {
  if (typeof window === 'undefined') return DEFAULT_SORT_ORDER
  const params = new URLSearchParams(window.location.search)
  const value = params.get(SORT_PARAM)
  if (value === null) return DEFAULT_SORT_ORDER
  if (isSortOrder(value) && value !== DEFAULT_SORT_ORDER) return value
  params.delete(SORT_PARAM)
  window.history.replaceState(window.history.state, '', urlFor(params))
  return DEFAULT_SORT_ORDER
}

/**
 * The archetype grid's sort order, backed by the `?sort=` URL param so a Power
 * view can be reloaded and shared. Popular (the default) is the param's absence.
 * Writes replace the history entry — and keep its state, which the archetype
 * hook marks its pushed entries with — so switching order never stacks history.
 * Every other param is preserved, so the order survives format/window switches.
 */
export function useSortOrder() {
  const [sortOrder, setSortOrderState] = useState<SortOrder>(readSortOrderFromUrl)

  useEffect(() => {
    const onPopState = () => setSortOrderState(readSortOrderFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setSortOrder = useCallback((next: SortOrder) => {
    const valid = isSortOrder(next) ? next : DEFAULT_SORT_ORDER
    setSortOrderState(valid)
    const params = new URLSearchParams(window.location.search)
    if (valid === DEFAULT_SORT_ORDER) params.delete(SORT_PARAM)
    else params.set(SORT_PARAM, valid)
    window.history.replaceState(window.history.state, '', urlFor(params))
  }, [])

  return { sortOrder, setSortOrder }
}
