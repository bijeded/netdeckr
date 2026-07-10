import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from './EmptyState'
import { TrendingCardName } from './TrendingTable'
import type { TrendingCard } from '../lib/trendingCards'

// The "Top Sideboard Cards" list: a lighter sibling of the trending table over
// board='side' only — rank · card · copy share, with no previous/change columns
// (a period delta on sideboard tech isn't tracked). Shares the bordered container
// and the dashed-underline card-art cell with TrendingTable.

const containerStyle: CSSProperties = {
  border: '1px solid var(--border-soft)',
  background: 'var(--surface-subtle)',
  borderRadius: 'var(--r-2xl)',
  overflow: 'hidden',
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '34px 1fr 92px',
  alignItems: 'center',
  gap: 8,
  padding: '11px 20px',
  borderBottom: '1px solid rgba(255,255,255,.035)',
}

interface TopSideboardCardsProps {
  cards: TrendingCard[]
}

export function TopSideboardCards({ cards }: TopSideboardCardsProps) {
  const { t } = useTranslation()

  return (
    <section style={containerStyle} aria-label={t('trending.sideboardTitle')}>
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
          {t('trending.sideboardTitle')}
        </h2>
      </div>

      {cards.length === 0 ? (
        <EmptyState message={t('trending.sideboardEmpty')} />
      ) : (
        cards.map((card, i) => (
          <div key={`${i}-${card.cardName}`} style={rowStyle}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>
              <TrendingCardName card={card} />
            </span>
            <span
              style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 'var(--fw-medium)',
              }}
            >
              {card.sharePct.toFixed(1)}%
            </span>
          </div>
        ))
      )}
    </section>
  )
}
