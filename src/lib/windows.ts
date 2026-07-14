// The two time windows the dashboard offers, with the same meaning, for every
// format. `code` is a format-independent logical key (the `?w=` param) that
// selects a client-side date range over the decks (see WINDOW_DAYS); `i18nKey`
// resolves the localized label via react-i18next. Last 2 Weeks contains Last 7
// Days as a date subset.
export const WINDOWS = [
  { code: '7days', i18nKey: 'windows.last7Days', isDefault: true },
  { code: '2weeks', i18nKey: 'windows.last2Weeks', isDefault: false },
] as const

export type WindowCode = (typeof WINDOWS)[number]['code']

export const DEFAULT_WINDOW: WindowCode = '7days'

// Lookback in days for each window, used to scope decklists (which are stored by
// event date, not window) to the selected time frame.
export const WINDOW_DAYS: Record<WindowCode, number> = {
  '7days': 7,
  '2weeks': 14,
}

/** ISO date (YYYY-MM-DD) marking the start of a window, `WINDOW_DAYS` before `now`. */
export function windowStartISO(window: WindowCode, now: Date = new Date()): string {
  const start = new Date(now.getTime() - WINDOW_DAYS[window] * 24 * 60 * 60 * 1000)
  return start.toISOString().slice(0, 10)
}

// The hook fetches two 2-week windows' worth of decks (28 days), so the
// immediately-preceding, equal-length slice is available client-side for the
// week-over-week share delta — without any stored history. Stays within the
// scraper's 30-day retention.
export const CORPUS_FETCH_DAYS = 2 * WINDOW_DAYS['2weeks']

/** ISO date (YYYY-MM-DD) marking the start of the fetched corpus, `CORPUS_FETCH_DAYS` before `now`. */
export function corpusFetchStartISO(now: Date = new Date()): string {
  const start = new Date(now.getTime() - CORPUS_FETCH_DAYS * 24 * 60 * 60 * 1000)
  return start.toISOString().slice(0, 10)
}

const CODES = WINDOWS.map((w) => w.code) as readonly string[]

export function isWindowCode(value: unknown): value is WindowCode {
  return typeof value === 'string' && CODES.includes(value)
}

/** Return the given window code if valid, otherwise the default window. */
export function normalizeWindow(value: unknown): WindowCode {
  return isWindowCode(value) ? value : DEFAULT_WINDOW
}
