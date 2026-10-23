// The two orders the archetype grid offers. `popular` (share descending) is the
// default and is represented by the absence of the `?sort=` param; `power` orders
// by tier, then Power Score (see `orderBreakdown` in lib/metagame.ts).
export const SORT_ORDERS = ['popular', 'power'] as const

export type SortOrder = (typeof SORT_ORDERS)[number]

export const DEFAULT_SORT_ORDER: SortOrder = 'popular'

export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && (SORT_ORDERS as readonly string[]).includes(value)
}

/** Return the given sort order if valid, otherwise the default (popular). */
export function normalizeSortOrder(value: unknown): SortOrder {
  return isSortOrder(value) ? value : DEFAULT_SORT_ORDER
}
