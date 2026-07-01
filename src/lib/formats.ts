// The five supported MTG formats. `code` is the MTGTop8/DB format code; `i18nKey`
// resolves the display name via react-i18next.
export const FORMATS = [
  { code: 'ST', i18nKey: 'formats.standard' },
  { code: 'PI', i18nKey: 'formats.pioneer' },
  { code: 'MO', i18nKey: 'formats.modern' },
  { code: 'PAU', i18nKey: 'formats.pauper' },
  { code: 'PREM', i18nKey: 'formats.premodern' },
] as const

export type FormatCode = (typeof FORMATS)[number]['code']

export const DEFAULT_FORMAT: FormatCode = 'ST'

const CODES = FORMATS.map((f) => f.code) as readonly string[]

export function isFormatCode(value: unknown): value is FormatCode {
  return typeof value === 'string' && CODES.includes(value)
}

/** Return the given code if valid, otherwise the default format. */
export function normalizeFormat(value: unknown): FormatCode {
  return isFormatCode(value) ? value : DEFAULT_FORMAT
}
