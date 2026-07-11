import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import { EmptyState } from './EmptyState'
import type { TrendingCard } from '../lib/trendingCards'

// A trending-cards table used for all three surfaces: Trending Creatures,
// Trending Spells (both with `showAvg`), and Top Sideboard Cards (without).
// Rows are rank · card · [avg Nx] · copies. Lands are excluded upstream (in the
// top_cards RPC); the mainboard/sideboard split and the creature/spell partition
// happen in the hook. Ported from the design's trending grid.

const containerStyle: CSSProperties = {
  border: '1px solid var(--border-soft)',
  background: 'var(--surface-subtle)',
  borderRadius: 'var(--r-2xl)',
  overflow: 'hidden',
}

const headerCellStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--fs-2xs)',
  fontWeight: 'var(--fw-bold)',
  letterSpacing: 'var(--track-wide)',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
}

const numCellStyle: CSSProperties = {
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  fontWeight: 'var(--fw-medium)',
}

/** A card name with its dashed underline + hover/touch art preview. */
export function TrendingCardName({ card }: { card: TrendingCard }) {
  return (
    <span style={{ width: 'fit-content', borderBottom: '1px dashed rgba(177,75,255,.4)' }}>
      <CardArtPreview name={card.cardName} imageUrl={card.imageUrl} />
    </span>
  )
}

interface TopCardsTableProps {
  /** Localized table title (e.g. "Trending Creatures"). */
  title: string
  cards: TrendingCard[]
  /** Show the average-copies-per-deck column (mainboard tables only). */
  showAvg?: boolean
  /** Localized empty-state message. */
  emptyMessage: string
}

export function TopCardsTable({ title, cards, showAvg = false, emptyMessage }: TopCardsTableProps) {
  const { t } = useTranslation()

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: showAvg ? '34px 1fr 64px 72px' : '34px 1fr 72px',
    alignItems: 'center',
    gap: 8,
    padding: '11px 20px',
    borderBottom: '1px solid rgba(255,255,255,.035)',
  }

  return (
    <section style={containerStyle} aria-label={title}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-hair)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: 'var(--neon-500)',
            boxShadow: '0 0 10px var(--neon-500)',
            transform: 'rotate(45deg)',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-h2)',
            fontWeight: 'var(--fw-bold)',
            letterSpacing: 'var(--track-snug)',
          }}
        >
          {title}
        </h2>
      </div>

      {cards.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div style={{ ...rowStyle, borderBottom: '1px solid var(--border-hair)' }}>
            <span style={headerCellStyle}>{t('trending.col.rank')}</span>
            <span style={headerCellStyle}>{t('trending.col.card')}</span>
            {showAvg && <span style={{ ...headerCellStyle, textAlign: 'right' }}>{t('trending.col.avg')}</span>}
            <span style={{ ...headerCellStyle, textAlign: 'right' }}>{t('trending.col.count')}</span>
          </div>

          {cards.map((card, i) => (
            <div key={`${i}-${card.cardName}`} style={rowStyle}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>
                <TrendingCardName card={card} />
              </span>
              {showAvg && <span style={{ ...numCellStyle, color: 'var(--text-muted)' }}>{card.avgCopies}x</span>}
              <span style={{ ...numCellStyle, color: 'var(--text-muted)' }}>{card.totalCopies}</span>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
