/**
 * Abbreviated day + month for an ISO date (YYYY-MM-DD), localized — e.g.
 * "5 Jul" (es) / "Jul 5" (en-US). Returns "" for empty or unparseable input.
 */
export function formatShortDate(isoDate: string, locale: string): string {
  if (!isoDate) return ''
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}
