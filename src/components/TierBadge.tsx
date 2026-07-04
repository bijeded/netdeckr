import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tier } from '../lib/tiers'

// `glow` is a hue-matched box-shadow so the badge reads as self-lit against any art
// (violet T1, cyan T2, a faint neutral halo on the fringe tiers to keep them a family).
const TIERS: Record<Tier, { color: string; bg: string; border: string; glow: string }> = {
  T1: { color: 'var(--tier-1)', bg: 'var(--neon-tint-16)', border: 'rgba(177,75,255,.55)', glow: '0 0 10px rgba(177,75,255,.45)' },
  T2: { color: 'var(--tier-2)', bg: 'rgba(127,216,255,.12)', border: 'rgba(127,216,255,.4)', glow: '0 0 10px rgba(127,216,255,.35)' },
  T3: { color: 'var(--tier-3)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.18)', glow: '0 0 8px rgba(255,255,255,.15)' },
  Otros: { color: 'var(--tier-rogue)', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.12)', glow: '0 0 8px rgba(255,255,255,.12)' },
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
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-2xs)',
        fontWeight: 'var(--fw-bold)',
        padding: '3px 9px',
        borderRadius: 'var(--r-sm)',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: c.glow,
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      {label}
    </span>
  )
}
