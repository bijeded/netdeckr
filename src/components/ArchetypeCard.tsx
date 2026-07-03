import { useState, type CSSProperties, type ReactNode } from 'react'
import { ManaPips } from './ManaPips'
import { TierBadge } from './TierBadge'

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
  /** Signature-card normal-size art (hotlinked Scryfall CDN); used when no crop. */
  artImageUrl?: string | null
  /** Signature-card cropped art (hotlinked Scryfall CDN); preferred over the normal image. */
  artCropUrl?: string | null
  /** Leader's share, so bars scale relative to the top archetype. */
  maxPct?: number
  selected?: boolean
  /** When true, the card is visually active and renders `children` below the header. */
  expanded?: boolean
  onClick?: () => void
  /** Expanded content (the decklist rows); rendered only when `expanded`. */
  children?: ReactNode
  style?: CSSProperties
}

export function ArchetypeCard({
  rank,
  name,
  colors,
  sharePct,
  artImageUrl = null,
  artCropUrl = null,
  maxPct = 100,
  selected = false,
  expanded = false,
  onClick,
  children,
  style,
}: ArchetypeCardProps) {
  const hue = hueFromName(name)
  const active = selected || expanded
  // Track the specific URL that failed rather than a boolean, so a card reused
  // for a different archetype (the grid keys by rank) doesn't suppress a new,
  // valid image after an earlier one 404'd.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // Prefer the cropped art; fall back to the normal image, then the gradient.
  const artUrl = artCropUrl ?? artImageUrl
  const showArt = artUrl != null && failedUrl !== artUrl

  // The header (art + stats) is the interactive region so the expanded deck rows
  // — which are their own buttons — are never nested inside a button.
  const header = (
    <>
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
        {showArt && (
          <img
            src={artUrl ?? undefined}
            alt=""
            data-testid="archetype-art"
            onError={() => setFailedUrl(artUrl)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // Frame the card art on the creature/spell, not the name/text box.
              objectPosition: 'center 18%',
            }}
          />
        )}
        <div style={{ position: 'absolute', left: 11, top: 10 }}>
          <ManaPips colors={colors} size={16} />
        </div>
        <TierBadge pct={sharePct} style={{ position: 'absolute', right: 10, top: 10 }} />
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
            #{rank}
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
    </>
  )

  const headerReset: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        border: `1px solid ${active ? 'var(--neon-border)' : 'var(--border-soft)'}`,
        background: 'var(--surface-card)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        transition: 'border-color var(--dur-slow), box-shadow var(--dur-slow)',
        boxShadow: active ? '0 0 0 1px rgba(177,75,255,.25), var(--shadow-card)' : 'none',
        ...style,
      }}
    >
      {onClick ? (
        <button type="button" aria-expanded={expanded} onClick={onClick} style={headerReset}>
          {header}
        </button>
      ) : (
        header
      )}
      {expanded && children}
    </div>
  )
}
