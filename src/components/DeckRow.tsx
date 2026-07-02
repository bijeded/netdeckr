import { useTranslation } from 'react-i18next'
import { ManaPips } from './ManaPips'
import type { DeckRow as Deck } from '../lib/deckSelection'

interface DeckRowProps {
  deck: Deck
  /** When provided, the row becomes a button that opens the decklist (task group 3). */
  onSelect?: (deck: Deck) => void
}

function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return ''
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DeckRow({ deck, onSelect }: DeckRowProps) {
  const { t, i18n } = useTranslation()
  const dateLabel = formatDate(deck.eventDate, i18n.language)
  const label = t('decks.rowLabel', {
    placement: deck.placement,
    player: deck.player,
    event: deck.eventName,
    date: dateLabel,
  })

  const content = (
    <>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-2xs)',
          color: 'var(--neon-text-soft)',
          minWidth: 34,
        }}
      >
        {deck.placement}
      </span>
      <ManaPips colors={deck.colorIdentity} size={12} />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 'var(--fw-semibold)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {deck.player}
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-2xs)',
          color: 'var(--text-faint)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {deck.eventName}
        {dateLabel ? ` · ${dateLabel}` : ''}
      </span>
    </>
  )

  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderTop: '1px solid var(--border-soft)',
    width: '100%',
    textAlign: 'left' as const,
    background: 'transparent',
    color: 'inherit',
  }

  if (onSelect) {
    return (
      <button type="button" aria-label={label} onClick={() => onSelect(deck)} style={{ ...style, cursor: 'pointer', border: 'none', borderTop: '1px solid var(--border-soft)' }}>
        {content}
      </button>
    )
  }
  return <div style={style}>{content}</div>
}
