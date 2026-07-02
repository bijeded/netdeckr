import type { CSSProperties } from 'react'
import { tierFor, type Tier } from '../lib/tiers'

const TIERS: Record<Tier, { color: string; bg: string; border: string }> = {
  T1: { color: 'var(--tier-1)', bg: 'var(--neon-tint-16)', border: 'rgba(177,75,255,.55)' },
  T2: { color: 'var(--tier-2)', bg: 'rgba(127,216,255,.12)', border: 'rgba(127,216,255,.4)' },
  T3: { color: 'var(--tier-3)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.18)' },
  Otros: { color: 'var(--tier-rogue)', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.12)' },
}

interface TierBadgeProps {
  /** Explicit tier; or pass `pct` to auto-classify. */
  tier?: Tier
  pct?: number
  style?: CSSProperties
}

/** Mono chip marking an archetype's tier (T1/T2/T3/Otros). */
export function TierBadge({ tier, pct, style }: TierBadgeProps) {
  const resolved = tier ?? (pct != null ? tierFor(pct) : 'T3')
  const c = TIERS[resolved]
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
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      {resolved}
    </span>
  )
}
