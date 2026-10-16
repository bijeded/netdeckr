import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ManaPips } from './ManaPips'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'
import { DecklistBoards } from './DecklistBoards'
import { DecklistViewToggle } from './DecklistViewToggle'
import { DeckExportButton } from './DeckExportButton'
import { useDeckCards } from '../hooks/useDeckCards'
import { useDeckExport } from '../hooks/useDeckExport'
import { placementBadge, type PlacementKind } from '../lib/placement'
import type { FormatCode } from '../lib/formats'
import type { DeckRow } from '../lib/deckSelection'

interface DecklistModalProps {
  deck: DeckRow
  /** Current format — decides whether the export copies MTG Arena or MTGO text. */
  format: FormatCode
  onClose: () => void
}

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
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full decklist modal: mainboard + sideboard for one deck. Dismissible; returns
 * focus to the element that opened it. */
export function DecklistModal({ deck, format, onClose }: DecklistModalProps) {
  const { t, i18n } = useTranslation()
  const { main, side, loading, error } = useDeckCards(deck.id)
  // The modal unmounts on close, so initialising to list view here is all the
  // "resets on every open" behaviour needs.
  const [images, setImages] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const badge = placementBadge(deck.placement)
  const badgeColors = BADGE[badge.kind]

  const { target, exportDeck, notice } = useDeckExport(main, side, format, deck.archetypeName)

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Move focus into the modal on open; restore it to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    borderRadius: 'var(--r-sm)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 'var(--fw-bold)',
    color: badgeColors.color,
    background: badgeColors.bg,
  }

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(5,5,9,.74)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decklist-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 880,
          background: 'var(--surface-modal)',
          border: '1px solid var(--border-line)',
          borderRadius: 'var(--r-3xl)',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        {/* Header. Desktop: title/meta on the left, actions on the right, same
            row. Mobile (see .modal-header in dashboard.css): actions move to
            their own right-aligned top row and the title/meta stack below at
            full width so a long name never collides with the buttons. */}
        <div
          className="modal-header"
          style={{
            padding: '16px 22px 16px',
            borderBottom: '1px solid var(--border-soft)',
            background: 'linear-gradient(120deg, var(--neon-tint-16), transparent 70%)',
          }}
        >
          <div className="modal-header-actions">
            <DecklistViewToggle images={images} onToggle={() => setImages((on) => !on)} />
            <DeckExportButton target={target} disabled={loading || !!error} onExport={exportDeck} />
            <button
              ref={closeRef}
              type="button"
              aria-label={t('modal.close')}
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                flex: '0 0 auto',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border-line)',
                background: 'var(--surface-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 'var(--fs-md)',
              }}
            >
              ✕
            </button>
          </div>
          <div className="modal-header-info" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7, flexWrap: 'wrap' }}>
            <ManaPips colors={deck.colorIdentity} size={13} />
            <span id="decklist-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-lg)', letterSpacing: 'var(--track-tight)' }}>
              {deck.archetypeName}
            </span>
            <span style={badgeStyle}>{badge.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: 'var(--text-faint)', fontSize: 'var(--fs-sm)' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 'var(--fw-semibold)' }}>{deck.player}</span>
            <span>·</span>
            <span>{deck.eventName}</span>
            <span>·</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{formatDate(deck.eventDate, i18n.language)}</span>
          </div>
          {notice && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-xs)',
                color: notice.tone === 'error' ? 'var(--down)' : 'var(--up)',
              }}
            >
              {notice.message}
            </div>
          )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
            <Spinner label={t('modal.loading')} />
          </div>
        ) : error ? (
          <EmptyState message={t('modal.error')} />
        ) : (
          <DecklistBoards main={main} side={side} images={images} />
        )}
      </div>
    </div>
  )
}
