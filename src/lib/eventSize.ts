/**
 * Event size classes for the Event-size filter. An event's size is its reported
 * `player_count`; MTGTop8 does not report one for every event.
 *
 * Thresholds are absolute and identical in every format, so "Large" denotes the
 * same field size on every tab. The consequence is deliberate: a format whose
 * events never reach a band shows that band empty rather than rescaling it into
 * something that means one thing in Pioneer and another in Modern.
 */
export type EventSizeClass = 'small' | 'medium' | 'large' | 'massive' | 'unsized'

/** Lower bounds (inclusive) of each sized band; below SMALL_MAX is `small`. */
const MEDIUM_MIN = 32
const LARGE_MIN = 96
const MASSIVE_MIN = 256

/** Every selectable class, in the order the filter offers them. */
export const EVENT_SIZE_CLASSES: EventSizeClass[] = [
  'small',
  'medium',
  'large',
  'massive',
  'unsized',
]

/**
 * Classify an event by its reported tournament size.
 *
 * An unreported size (`null`) is its own class, **not** `small`: the filter can
 * only claim what the source reported, and ~14% of events carry no size at all.
 * Note this is deliberately *not* how `powerScore.sizeWeight()` treats null —
 * that one floors it to the small-event weight, because a score needs a number
 * where a filter can honestly say "unknown". The asymmetry is intended.
 */
export function sizeClassOf(playerCount: number | null): EventSizeClass {
  if (playerCount === null || playerCount <= 0) return 'unsized'
  if (playerCount >= MASSIVE_MIN) return 'massive'
  if (playerCount >= LARGE_MIN) return 'large'
  if (playerCount >= MEDIUM_MIN) return 'medium'
  return 'small'
}
