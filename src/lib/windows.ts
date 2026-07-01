// The five MTGTop8 time-window / event-scope options, exposed as one combined
// selector. `code` is the MTGTop8 `meta` param (also the DB `meta_window` value);
// `i18nKey` resolves the localized label via react-i18next.
export const WINDOWS = [
  { code: '50', i18nKey: 'windows.last2Weeks', isDefault: true },
  { code: '326', i18nKey: 'windows.last5Days', isDefault: false },
  { code: '52', i18nKey: 'windows.last2Months', isDefault: false },
  { code: '46', i18nKey: 'windows.largeEvents2Months', isDefault: false },
  { code: '285', i18nKey: 'windows.mtgo2Months', isDefault: false },
] as const

export type WindowCode = (typeof WINDOWS)[number]['code']

export const DEFAULT_WINDOW: WindowCode = '50'

const CODES = WINDOWS.map((w) => w.code) as readonly string[]

export function isWindowCode(value: unknown): value is WindowCode {
  return typeof value === 'string' && CODES.includes(value)
}

/** Return the given window code if valid, otherwise the default window. */
export function normalizeWindow(value: unknown): WindowCode {
  return isWindowCode(value) ? value : DEFAULT_WINDOW
}
