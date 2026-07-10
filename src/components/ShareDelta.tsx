import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShareDelta as ShareDeltaValue } from '../lib/shareDelta'

// The number-shown sibling of TrendIndicator (both ported from the design's
// ChangeIndicator): a mono ▲/▼/– chip PLUS the signed percentage-point value of
// an archetype's period-over-period metagame-share change. Green up / red down /
// amber flat, matching the tier badge and trend arrow. Lives in the card's stat
// footer (opposite the share %), not overlaid on art. Renders nothing when the
// delta is suppressed (null) — the field's preceding slice was too thin.
const STYLES: Record<
  ShareDeltaValue['direction'],
  { color: string; bg: string; border: string; glyph: string; key: string }
> = {
  up: { color: 'var(--up)', bg: 'var(--up-tint)', border: 'var(--up-border)', glyph: '▲', key: 'shareDelta.up' },
  down: { color: 'var(--down)', bg: 'var(--down-tint)', border: 'var(--down-border)', glyph: '▼', key: 'shareDelta.down' },
  // '–' is an en-dash (U+2013), matching the design glyph set — not a hyphen.
  flat: { color: 'var(--flat)', bg: 'var(--flat-tint)', border: 'var(--flat-border)', glyph: '–', key: 'shareDelta.flat' },
}

interface ShareDeltaProps {
  /** The period-over-period share delta; null suppresses the indicator entirely. */
  delta: ShareDeltaValue | null
  style?: CSSProperties
}

/** Mono ▲/▼/– chip + signed pp value marking an archetype's week-over-week share change. */
export function ShareDelta({ delta, style }: ShareDeltaProps) {
  const { t } = useTranslation()
  if (!delta) return null

  const c = STYLES[delta.direction]
  const magnitude = Math.abs(delta.valuePct).toFixed(1)
  // Flat shows a neutral 0.0 (the change is within the deadband); up/down carry
  // an explicit sign. The aria-label interpolates the magnitude for up/down.
  const text = delta.direction === 'up' ? `+${magnitude}` : delta.direction === 'down' ? `-${magnitude}` : '0.0'
  const label = delta.direction === 'flat' ? t(c.key) : t(c.key, { value: magnitude })

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-2xs)',
        fontWeight: 'var(--fw-bold)',
        lineHeight: 1,
        padding: '4px 8px',
        borderRadius: 'var(--r-sm)',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        ...style,
      }}
    >
      <span aria-hidden="true">{c.glyph}</span>
      {text}
    </span>
  )
}
