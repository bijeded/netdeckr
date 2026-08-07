import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Trend } from '../lib/powerScore'
import { CHIP_BASE, CHIP_INSET_HIGHLIGHT } from './chipBase'

// Arrow-only variant of the design system's ChangeIndicator: it conveys the
// direction of an archetype's window-over-window performance change with a glyph
// and semantic color only — never the raw Power Score or a numeric delta.
//
// It shares the tier badge's chip treatment (CHIP_BASE) so the two overlaid chips
// read as equally prominent — the tier badge earns attention through its own ramp,
// not by the trend arrow being quieted. There is no ramp here: a trend has no rank
// to encode, so it sits at a constant size matching the badge's T3 step.
const TRENDS: Record<Trend, { color: string; hue: string; glyph: string; key: string; glow: string }> = {
  up: { color: 'var(--up-on-dark)', hue: '47,230,160', glyph: '▲', key: 'trend.up', glow: '0 0 12px rgba(47,230,160,.38)' },
  down: { color: 'var(--down-on-dark)', hue: '255,84,112', glyph: '▼', key: 'trend.down', glow: '0 0 12px rgba(255,84,112,.38)' },
  // '–' is an en-dash (U+2013), matching the design glyph set — not a hyphen.
  flat: { color: 'var(--flat-on-dark)', hue: '255,203,69', glyph: '–', key: 'trend.flat', glow: '0 0 12px rgba(255,203,69,.38)' },
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
        ...CHIP_BASE,
        fontSize: '12.5px',
        fontWeight: 700,
        padding: '3px 9px',
        color: c.color,
        border: `1px solid rgba(${c.hue},.45)`,
        boxShadow: `${c.glow}, ${CHIP_INSET_HIGHLIGHT}`,
        ...style,
      }}
    >
      <span aria-hidden="true">{c.glyph}</span>
    </span>
  )
}
