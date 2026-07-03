// The two time windows the dashboard offers, with the same meaning, for every
// format. `code` is a format-independent logical key (the `?w=` param) that
// selects a client-side date range over the decks (see WINDOW_DAYS); `i18nKey`
// resolves the localized label via react-i18next. Last 2 Weeks contains Last 5
// Days as a date subset.
export const WINDOWS = [
  { code: '5days', i18nKey: 'windows.last5Days', isDefault: true },
  { code: '2weeks', i18nKey: 'windows.last2Weeks', isDefault: false },
] as const

export type WindowCode = (typeof WINDOWS)[number]['code']

export const DEFAULT_WINDOW: WindowCode = '5days'

// Lookback in days for each window, used to scope decklists (which are stored by
// event date, not window) to the selected time frame.
export const WINDOW_DAYS: Record<WindowCode, number> = {
  '5days': 5,
  '2weeks': 14,
}

/** ISO date (YYYY-MM-DD) marking the start of a window, `WINDOW_DAYS` before `now`. */
export function windowStartISO(window: WindowCode, now: Date = new Date()): string {
  const start = new Date(now.getTime() - WINDOW_DAYS[window] * 24 * 60 * 60 * 1000)
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
