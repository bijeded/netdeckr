import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Trend } from '../lib/powerScore'

// Arrow-only variant of the design system's ChangeIndicator: it conveys the
// direction of an archetype's window-over-window performance change with a glyph
// and semantic color only — never the raw Power Score or a numeric delta.
const TRENDS: Record<Trend, { color: string; bg: string; border: string; glyph: string; key: string }> = {
  up: { color: 'var(--up)', bg: 'var(--up-tint)', border: 'var(--up-border)', glyph: '▲', key: 'trend.up' },
  down: { color: 'var(--down)', bg: 'var(--down-tint)', border: 'var(--down-border)', glyph: '▼', key: 'trend.down' },
  // '–' is an en-dash (U+2013), matching the design glyph set — not a hyphen.
  flat: { color: 'var(--flat)', bg: 'var(--flat-tint)', border: 'var(--flat-border)', glyph: '–', key: 'trend.flat' },
}

interface TrendIndicatorProps {
  trend: Trend
  style?: CSSProperties
}

/** Mono ▲/▼/– chip marking an archetype's recent-window performance momentum. */
export function TrendIndicator({ trend, style }: TrendIndicatorProps) {
  const { t } = useTranslation()
  const c = TRENDS[trend]
  return (
    <span
      role="img"
      aria-label={t(c.key)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-2xs)',
        fontWeight: 'var(--fw-bold)',
        lineHeight: 1,
        padding: '3px 7px',
        borderRadius: 'var(--r-sm)',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      <span aria-hidden="true">{c.glyph}</span>
    </span>
  )
}
