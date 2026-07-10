// Pure derivation of the period-over-period metagame-share delta shown on each
// archetype card. Compares an archetype's share in the selected window to its
// share in the immediately-preceding, equal-length window — both sourced from the
// same fetched deck corpus (within the 30-day retention), so no history table is
// needed. Lives here (not in the hook or JSX) so it stays unit-testable.

import { WINDOW_DAYS, type WindowCode } from './windows'

/** Percentage-point deadband: a change smaller than this reads as flat (–). */
export const DELTA_EPS = 0.5
/**
 * Minimum decks the **preceding** slice must hold (across the field) before any
 * delta is shown. Below this the corpus can't support a comparison (e.g. the DB
 * does not yet span a full preceding period), so the indicator is suppressed
 * entirely rather than manufacturing a spike against a near-empty baseline.
 */
export const MIN_PREV_DECKS = 3

/** Signed share delta for one archetype, as rendered by the ShareDelta indicator. */
export interface ShareDelta {
  direction: 'up' | 'down' | 'flat'
  /** Selected-minus-preceding metagame share, in percentage points (signed). */
  valuePct: number
}

/** The per-deck facts the share delta needs — one entry per deck in the fetched corpus. */
export interface DeckForShareDelta {
  archetypeName: string
  /** Event date (YYYY-MM-DD); null when unknown — such decks are ignored. */
  eventDate: string | null
}

/** ISO date (YYYY-MM-DD) `days` before `now`. */
function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Count decks per archetype and the total, over the given slice. */
function tally(decks: DeckForShareDelta[]): { counts: Map<string, number>; total: number } {
  const counts = new Map<string, number>()
  let total = 0
  for (const deck of decks) {
    if (!deck.archetypeName) continue
    counts.set(deck.archetypeName, (counts.get(deck.archetypeName) ?? 0) + 1)
    total += 1
  }
  return { counts, total }
}

/**
 * Compute the per-archetype share delta between the selected window and the
 * immediately-preceding, equal-length window. The selected slice is `[now−N, now]`
 * and the preceding slice is `[now−2N, now−N)`, where N = `WINDOW_DAYS[window]`.
 * Share is computed **within each slice** (count / that slice's total), so the
 * delta reflects a change in field proportion, not raw deck count.
 *
 * Returns a map keyed by archetype name; an archetype present in either slice has
 * an entry (absent-in-preceding ⇒ a genuine rise of its full current share). Returns
 * `null` when the preceding slice holds fewer than `MIN_PREV_DECKS` decks, so the
 * caller shows no indicator at all.
 */
export function shareDeltas(
  decks: DeckForShareDelta[],
  window: WindowCode,
  now: Date = new Date(),
): Map<string, ShareDelta> | null {
  const n = WINDOW_DAYS[window]
  const selectedStart = isoDaysAgo(now, n)
  const precedingStart = isoDaysAgo(now, 2 * n)

  const selected: DeckForShareDelta[] = []
  const preceding: DeckForShareDelta[] = []
  for (const deck of decks) {
    if (!deck.eventDate) continue
    if (deck.eventDate >= selectedStart) selected.push(deck)
    else if (deck.eventDate >= precedingStart) preceding.push(deck)
  }

  const prev = tally(preceding)
  if (prev.total < MIN_PREV_DECKS) return null

  const curr = tally(selected)
  const names = new Set<string>([...curr.counts.keys(), ...prev.counts.keys()])

  const deltas = new Map<string, ShareDelta>()
  for (const name of names) {
    const currShare = curr.total > 0 ? ((curr.counts.get(name) ?? 0) / curr.total) * 100 : 0
    const prevShare = prev.total > 0 ? ((prev.counts.get(name) ?? 0) / prev.total) * 100 : 0
    const valuePct = currShare - prevShare
    const direction: ShareDelta['direction'] =
      valuePct > DELTA_EPS ? 'up' : valuePct < -DELTA_EPS ? 'down' : 'flat'
    deltas.set(name, { direction, valuePct })
  }
  return deltas
}
