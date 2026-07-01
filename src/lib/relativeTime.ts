// Localized "X ago" formatting via Intl.RelativeTimeFormat (no dependency).

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/**
 * Format the elapsed time between `isoTimestamp` and `now` as a localized
 * relative string, e.g. "2 hours ago" / "hace 2 horas".
 */
export function relativeTimeFromNow(isoTimestamp: string, now: Date, locale: string): string {
  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) return '' // guard against a malformed timestamp from the DB

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  let duration = (then - now.getTime()) / 1000 // seconds, negative for past

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return formatter.format(Math.round(duration), 'year')
}
