// The three time windows that exist, with the same meaning, for every format.
// `code` is a format-independent logical key (also the DB `meta_window` value and
// the `?w=` param); `i18nKey` resolves the localized label via react-i18next. The
// scraper maps each logical window to that format's per-format MTGTop8 meta ID.
export const WINDOWS = [
  { code: '5days', i18nKey: 'windows.last5Days', isDefault: true },
  { code: '2weeks', i18nKey: 'windows.last2Weeks', isDefault: false },
  { code: '2months', i18nKey: 'windows.last2Months', isDefault: false },
] as const

export type WindowCode = (typeof WINDOWS)[number]['code']

export const DEFAULT_WINDOW: WindowCode = '5days'

const CODES = WINDOWS.map((w) => w.code) as readonly string[]

export function isWindowCode(value: unknown): value is WindowCode {
  return typeof value === 'string' && CODES.includes(value)
}

/** Return the given window code if valid, otherwise the default window. */
export function normalizeWindow(value: unknown): WindowCode {
  return isWindowCode(value) ? value : DEFAULT_WINDOW
}
