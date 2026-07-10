import type { TFunction } from 'i18next'
import { formatShortDate } from './formatDate'

/** The minimal event shape the label needs (a subset of EventOption). */
export interface LabelledEvent {
  name: string
  /** ISO date (YYYY-MM-DD); "" when unknown. */
  eventDate: string
  /** Tournament size; null/absent when MTGTop8 didn't report it. */
  playerCount: number | null
}

/**
 * The one place an event is turned into a display label, shared by the header
 * caption and the Event-filter dropdown so they never diverge. Format:
 * `"{name} — {date} (N players)"`, dropping the date when unknown (→ `"{name}"`)
 * and the size parenthetical when the player count is not a positive number. The
 * event name is a proper noun and stays as-is; the date is localized via `lang`
 * and the size text via `t` (`dashboard.eventSize`, count-aware plural).
 */
export function eventLabel(
  event: LabelledEvent,
  lang: string,
  t: TFunction,
): string {
  const date = formatShortDate(event.eventDate, lang)
  const base = date ? `${event.name} — ${date}` : event.name
  if (event.playerCount != null && event.playerCount > 0) {
    return `${base} (${t('dashboard.eventSize', { count: event.playerCount })})`
  }
  return base
}
