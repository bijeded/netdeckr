import type { CSSProperties } from 'react'
import { ManaPips } from './ManaPips'

// A stable hue (0-360) derived from the name, so placeholder art varies per card.
function hueFromName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360
  return hash
}

interface ArchetypeCardProps {
  rank: number
  name: string
  /** WUBRG color-identity string; "" renders a colorless gray pip. */
  colors: string
  sharePct: number
  /** Leader's share, so bars scale relative to the top archetype. */
  maxPct?: number
  selected?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export function ArchetypeCard({
  rank,
  name,
  colors,
  sharePct,
  maxPct = 100,
  selected = false,
  onClick,
  style,
}: ArchetypeCardProps) {
  const hue = hueFromName(name)
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      style={{
        border: `1px solid ${selected ? 'var(--neon-border)' : 'var(--border-soft)'}`,
        background: 'var(--surface-card)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--dur-slow), box-shadow var(--dur-slow)',
        boxShadow: selected ? '0 0 0 1px rgba(177,75,255,.25), var(--shadow-card)' : 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 118,
          overflow: 'hidden',
          background: `linear-gradient(150deg, oklch(0.32 0.09 ${hue}), oklch(0.16 0.05 ${hue}))`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 11px)',
          }}
        />
        <div style={{ position: 'absolute', left: 11, top: 10 }}>
          <ManaPips colors={colors} size={16} />
        </div>
      </div>
      <div style={{ padding: '13px 14px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-2xs)',
              color: 'var(--text-faint)',
            }}
          >
            {String(rank).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--fs-md)',
              letterSpacing: 'var(--track-snug)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-stat)',
            fontWeight: 'var(--fw-bold)',
            letterSpacing: '-.02em',
            lineHeight: 1,
          }}
        >
          {sharePct.toFixed(1)}%
        </div>
        <div
          style={{
            marginTop: 11,
            height: 4,
            borderRadius: 3,
            background: 'rgba(255,255,255,.06)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (sharePct / maxPct) * 100)}%`,
              background: 'var(--neon-gradient)',
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    </div>
  )
}
