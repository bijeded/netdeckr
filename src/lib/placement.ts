// Map a raw MTGTop8 finish label ("1", "2", "3-4", "5-8", …) to a display badge:
// "1st" / "2nd" / "Top 4", and for deeper finishes either "Top <upper>" for a
// bracket range ("5-8" → "Top 8", "9-16" → "Top 16") or a bare number for a single
// standing worse than 8th ("14" → "14"). These competitive labels stay in English
// in both locales (like MTG proper nouns). `kind` drives the badge colour.

export type PlacementKind = 'first' | 'second' | 'top4' | 'other'

export interface PlacementBadge {
  label: string
  kind: PlacementKind
}

/**
 * Sort key for a finish label: the first integer it contains ("3-4" → 3), or
 * +Infinity when there is none, so unplaced decks sort last. Lower = better.
 */
export function placementSortKey(placement: string): number {
  const match = placement.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

export function placementBadge(placement: string): PlacementBadge {
  const nums = placement.match(/\d+/g)?.map(Number) ?? []
  if (nums.length === 0) return { label: placement || '—', kind: 'other' }

  const low = nums[0]
  const high = nums[nums.length - 1]

  if (low === 1 && high === 1) return { label: '1st', kind: 'first' }
  if (low === 2 && high === 2) return { label: '2nd', kind: 'second' }
  if (high <= 4) return { label: 'Top 4', kind: 'top4' }
  // A single standing worse than 8th is an individual finish, not a bracket — show
  // the bare number. Ranges ("5-8", "9-16") and single standings ≤ 8th keep "Top n".
  if (nums.length === 1 && high > 8) return { label: String(high), kind: 'other' }
  return { label: `Top ${high}`, kind: 'other' }
}
