import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import { EmptyState } from './EmptyState'
import { ShareDelta } from './ShareDelta'
import { formatPlayRate, type TrendingCard } from '../lib/trendingCards'

// The trending-cards table, one layout for all four surfaces (Top Creatures, Top
// Spells, Top Sideboard Cards, Top New Cards). Rows are rank · card · avg Nx ·
// copies · decks % · trend. Lands are excluded upstream (in the top_cards RPC;
// recent_set_top_cards drops only basics); the mainboard/sideboard split, the
// creature/spell partition, play rate and trend happen in the hook and
// trendingCards.ts. The grid tracks live in dashboard.css (`.top-cards-row`) so a
// container query can drop Copies when the table itself is narrow — its width
// follows the 2x2 grid and the sidebar, not the viewport.

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

const rowStyle: CSSProperties = {
  alignItems: 'center',
  gap: 8,
  padding: '11px 20px',
  borderBottom: '1px solid rgba(255,255,255,.035)',
}

const numHeaderStyle: CSSProperties = { ...headerCellStyle, textAlign: 'right' }
const numValueStyle: CSSProperties = { ...numCellStyle, color: 'var(--text-muted)' }

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
  /** Localized empty-state message. */
  emptyMessage: string
}

export function TopCardsTable({ title, cards, emptyMessage }: TopCardsTableProps) {
  const { t } = useTranslation()

  return (
    <section className="top-cards" style={containerStyle} aria-label={title}>
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
          <div className="top-cards-row" style={{ ...rowStyle, borderBottom: '1px solid var(--border-hair)' }}>
            <span style={headerCellStyle}>{t('trending.col.rank')}</span>
            <span style={headerCellStyle}>{t('trending.col.card')}</span>
            <span style={numHeaderStyle}>{t('trending.col.avg')}</span>
            <span className="top-cards-copies" style={numHeaderStyle}>{t('trending.col.count')}</span>
            <span style={numHeaderStyle}>{t('trending.col.decks')}</span>
            <span style={numHeaderStyle}>{t('trending.col.trend')}</span>
          </div>

          {cards.map((card, i) => (
            <div key={`${i}-${card.cardName}`} className="top-cards-row" style={rowStyle}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>
                <TrendingCardName card={card} />
              </span>
              <span style={numValueStyle}>{card.avgCopies}x</span>
              <span className="top-cards-copies" style={numValueStyle}>{card.totalCopies}</span>
              <span style={numValueStyle}>{formatPlayRate(card.playRatePct)}</span>
              {/* An empty cell (not a missing one) when the trend is suppressed, so the grid holds. */}
              <span style={{ justifySelf: 'end' }}>
                <ShareDelta delta={card.trend} labelKeyPrefix="trending.trend" />
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
