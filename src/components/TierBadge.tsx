import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tier } from '../lib/tiers'
import { CHIP_BASE, CHIP_INSET_HIGHLIGHT } from './chipBase'

/**
 * Per-tier ramp. Size and footprint are deliberately constant across tiers —
 * the scrim and shadow carry legibility on their own, so scaling the badge up
 * only made the card's corner heavy without buying readability. What still
 * descends monotonically from T1 to the fringe tier is weight, rim brightness,
 * and glow, which is enough to keep the tier *order* readable without hue: in
 * greyscale, or to a viewer who cannot separate violet from cyan.
 *
 * Legibility is not part of that ramp: `color` clears 4.5:1 against the chip
 * scrim for every tier, the fringe tier included. It reads as last because it
 * sits last on the ramp, never because it is faint.
 */
const FONT_SIZE = '12px'
const PADDING = '3px 9px'

const TIERS: Record<Tier, { color: string; hue: string; borderAlpha: number; fontWeight: number; glow: string | null }> = {
  T1: { color: 'var(--tier-1-on-dark)', hue: '177,75,255', borderAlpha: 0.7, fontWeight: 800, glow: '0 0 16px rgba(177,75,255,.5)' },
  T2: { color: 'var(--tier-2-on-dark)', hue: '127,216,255', borderAlpha: 0.55, fontWeight: 700, glow: '0 0 12px rgba(127,216,255,.38)' },
  T3: { color: 'var(--tier-3-on-dark)', hue: '255,255,255', borderAlpha: 0.3, fontWeight: 700, glow: '0 0 8px rgba(255,255,255,.12)' },
  Otros: { color: 'var(--tier-rogue-on-dark)', hue: '255,255,255', borderAlpha: 0.18, fontWeight: 600, glow: null },
}

interface TierBadgeProps {
  /** The archetype's performance tier (assigned from its Power Score). */
  tier: Tier
  style?: CSSProperties
}

/** Mono chip marking an archetype's tier (T1/T2/T3/Otros). */
export function TierBadge({ tier, style }: TierBadgeProps) {
  const { t } = useTranslation()
  const c = TIERS[tier]
  // T1/T2/T3 are universal; only the fringe tier is localized (EN "Rogue" / ES "Otros").
  const label = tier === 'Otros' ? t('tiers.rogue') : tier
  return (
    <span
      data-testid={`tier-badge-${tier}`}
      style={{
        ...CHIP_BASE,
        fontSize: FONT_SIZE,
        fontWeight: c.fontWeight,
        padding: PADDING,
        color: c.color,
        border: `1px solid rgba(${c.hue},${c.borderAlpha})`,
        boxShadow: c.glow ? `${c.glow}, ${CHIP_INSET_HIGHLIGHT}` : CHIP_INSET_HIGHLIGHT,
        ...style,
      }}
    >
      {label}
    </span>
  )
}
