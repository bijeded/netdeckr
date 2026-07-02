import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { placementBadge, type PlacementKind } from '../lib/placement'
import type { DeckRow } from '../lib/deckSelection'

interface DeckCardProps {
  deck: DeckRow
  /** Opens the decklist modal (wired in task group 3). */
  onSelect?: (deck: DeckRow) => void
}

// Position-badge colours by finish kind (design: 1st green, 2nd cyan, Top 4 violet).
const BADGE: Record<PlacementKind, { color: string; bg: string }> = {
  first: { color: 'var(--up)', bg: 'var(--up-tint)' },
  second: { color: 'var(--tier-2)', bg: 'rgba(127,216,255,.12)' },
  top4: { color: 'var(--neon-text-soft)', bg: 'var(--neon-tint-16)' },
  other: { color: 'var(--text-faint)', bg: 'rgba(255,255,255,.06)' },
}

function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return ''
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function DeckCard({ deck, onSelect }: DeckCardProps) {
  const { t, i18n } = useTranslation()
  const badge = placementBadge(deck.placement)
  const badgeColors = BADGE[badge.kind]
  const dateLabel = formatDate(deck.eventDate, i18n.language)
  const label = t('decks.rowLabel', {
    placement: badge.label,
    player: deck.player,
    event: deck.eventName,
    date: dateLabel,
  })

  // border/background/radius + hover live in the `.deck-card` class (dashboard.css)
  // so the hover border-color isn't overridden by an inline border.
  const cardStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    minWidth: 0,
    textAlign: 'left',
    font: 'inherit',
    color: 'inherit',
    padding: 12,
    cursor: 'pointer',
  }

  return (
    <button type="button" className="deck-card" aria-label={label} onClick={() => onSelect?.(deck)} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-2xs)',
            fontWeight: 'var(--fw-bold)',
            color: badgeColors.color,
            background: badgeColors.bg,
          }}
        >
          {badge.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--fw-semibold)',
          fontSize: 'var(--fs-sm)',
          marginBottom: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {deck.player}
      </div>
      <div
        style={{
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-faint)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {deck.eventName}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-2xs)',
          color: 'var(--text-faint)',
        }}
      >
        <span>{dateLabel}</span>
        {onSelect && <span style={{ marginLeft: 'auto', color: 'var(--neon-text-soft)' }}>{t('decks.viewDeck')} →</span>}
      </div>
    </button>
  )
}
