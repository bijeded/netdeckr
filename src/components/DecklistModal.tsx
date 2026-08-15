import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ManaPips } from './ManaPips'
import { CardArtPreview } from './CardArtPreview'
import { CardTile } from './CardTile'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'
import { useDeckCards, type DeckCardLine } from '../hooks/useDeckCards'
import { groupMainByType, type CardTypeCategory } from '../lib/cardType'
import { placementBadge, type PlacementKind } from '../lib/placement'
import { arenaDelivery, buildArenaDeck, arenaFilename } from '../lib/arenaExport'
import type { FormatCode } from '../lib/formats'
import type { DeckRow } from '../lib/deckSelection'

interface DecklistModalProps {
  deck: DeckRow
  /** Current format — decides clipboard (Arena formats) vs .txt download. */
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

function CardLine({ line }: { line: DeckCardLine }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '3px 0', breakInside: 'avoid' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--neon-text-soft)', width: 18, flex: '0 0 auto' }}>
        {line.quantity}
      </span>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
        <CardArtPreview name={line.name} imageUrl={line.imageUrl} />
      </span>
    </div>
  )
}

/** Card-type groups rendered within the mainboard, in fixed order. */
const CARD_GROUP_ORDER: CardTypeCategory[] = ['lands', 'creatures', 'spells', 'other']

/**
 * Image view flattens the same groups into one grid in a different order, with
 * lands last. There are no per-group wrappers, so a type transition never starts
 * a new row — the lands simply continue whichever row the spells ended on.
 */
const CARD_TILE_ORDER: CardTypeCategory[] = ['creatures', 'spells', 'other', 'lands']

const sumQuantity = (lines: DeckCardLine[]) => lines.reduce((total, line) => total + line.quantity, 0)

/** A subdued sub-heading for a mainboard card-type group (e.g. Lands · 24). */
function GroupHeading({ label, count }: { label: string; count: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        margin: '14px 0 6px',
        breakInside: 'avoid',
        breakAfter: 'avoid',
      }}
    >
      <span
        data-testid="card-group-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-2xs)',
          fontWeight: 'var(--fw-semibold)',
          letterSpacing: 'var(--track-wide)',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>
        {count}
      </span>
    </div>
  )
}

function SectionHeading({ label, count }: { label: string; count: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-2xs)',
          fontWeight: 'var(--fw-bold)',
          letterSpacing: 'var(--track-wide)',
          textTransform: 'uppercase',
          color: 'var(--neon-text-soft)',
        }}
      >
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}>
        {count}
      </span>
    </div>
  )
}

/** Full decklist modal: mainboard + sideboard for one deck. Dismissible; returns
 * focus to the element that opened it. */
export function DecklistModal({ deck, format, onClose }: DecklistModalProps) {
  const { t, i18n } = useTranslation()
  const { main, side, mainCount, sideCount, loading, error } = useDeckCards(deck.id)
  const mainGroups = useMemo(() => groupMainByType(main), [main])
  // Flat, lands-last ordering for image view. One array, one grid, no group
  // wrappers — which is what lets lands continue the preceding row.
  const mainTiles = useMemo(
    () => CARD_TILE_ORDER.flatMap((category) => mainGroups[category]),
    [mainGroups],
  )
  // The modal unmounts on close, so initialising to list view here is all the
  // "resets on every open" behaviour needs.
  const [images, setImages] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null)
  const badge = placementBadge(deck.placement)
  const badgeColors = BADGE[badge.kind]

  const delivery = arenaDelivery(format)

  async function handleExport() {
    const text = buildArenaDeck(main, side, deck.archetypeName)
    if (delivery === 'clipboard') {
      try {
        await navigator.clipboard.writeText(text)
        setNotice({ tone: 'ok', message: t('modal.export.copied') })
      } catch {
        setNotice({ tone: 'error', message: t('modal.export.error') })
      }
      return
    }
    let url: string | null = null
    try {
      url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = arenaFilename(deck.archetypeName)
      anchor.click()
      setNotice({ tone: 'ok', message: t('modal.export.downloaded') })
    } catch {
      setNotice({ tone: 'error', message: t('modal.export.error') })
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

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
            <button
              type="button"
              onClick={() => setImages((on) => !on)}
              aria-pressed={images}
              aria-label={t(images ? 'modal.view.toList' : 'modal.view.toImages')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 13px',
                flex: '0 0 auto',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-line)',
                background: 'var(--surface-subtle)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 'var(--fw-semibold)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">{images ? '≡' : '▦'}</span>
              {/* Label is hidden below 640px — the mobile header row has no space
                  for a third labelled control (see .modal-view-label). */}
              <span className="modal-view-label">
                {t(images ? 'modal.view.toList' : 'modal.view.toImages')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || !!error}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 13px',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--neon-border)',
                background: 'var(--neon-tint-16)',
                color: 'var(--neon-text)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 'var(--fw-semibold)',
                cursor: loading || error ? 'not-allowed' : 'pointer',
                opacity: loading || error ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">⬇</span>
              {t(delivery === 'clipboard' ? 'modal.export.action' : 'modal.export.download')}
            </button>
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
          <div className={images ? 'decklist-grid decklist-grid-images' : 'decklist-grid'}>
            <div style={{ padding: '20px 22px', borderRight: '1px solid var(--border-soft)' }}>
              <SectionHeading label={t('modal.main')} count={t('modal.cards', { count: mainCount })} />
              {images ? (
                <div className="decklist-tiles">
                  {mainTiles.map((line, i) => (
                    <CardTile key={`mt-${i}-${line.name}`} line={line} />
                  ))}
                </div>
              ) : (
                <div className="decklist-main-cols">
                  {CARD_GROUP_ORDER.map((category) => {
                    const lines = mainGroups[category]
                    if (lines.length === 0) return null
                    return (
                      <Fragment key={category}>
                        <GroupHeading
                          label={t(`modal.group.${category}`)}
                          count={t('modal.cards', { count: sumQuantity(lines) })}
                        />
                        {lines.map((line, i) => (
                          <CardLine key={`m-${category}-${i}-${line.name}`} line={line} />
                        ))}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 22px', background: 'var(--surface-faint)' }}>
              <SectionHeading label={t('modal.side')} count={t('modal.cards', { count: sideCount })} />
              {images ? (
                <div className="decklist-tiles">
                  {side.map((line, i) => (
                    <CardTile key={`st-${i}-${line.name}`} line={line} />
                  ))}
                </div>
              ) : (
                side.map((line, i) => <CardLine key={`s-${i}-${line.name}`} line={line} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
