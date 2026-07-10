import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import { EmptyState } from './EmptyState'
import { ShareDelta } from './ShareDelta'
import { TRENDING_TOP_N, type TrendingCard } from '../lib/trendingCards'

// The "En Tendencia" trending table: the top mainboard cards for the current
// metagame view, ranked by copy share, each with its previous-period share and a
// ▲/▼/– change chip. When every delta is suppressed (thin preceding data or an
// event filter) the "% Previous" / change columns drop out entirely, leaving a
// rank · card · share layout. Ported from the design's 5-column trending grid.

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

interface TrendingTableProps {
  cards: TrendingCard[]
}

export function TrendingTable({ cards }: TrendingTableProps) {
  const { t } = useTranslation()
  // Deltas are all-or-nothing (rankTrendingCards suppresses field-wide), so a
  // single check drives whether the "% Previous" and change columns render.
  const showDelta = cards.some((c) => c.delta !== null)
  const columns = showDelta ? '34px 1fr 92px 92px 110px' : '34px 1fr 92px'

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: columns,
    alignItems: 'center',
    gap: 8,
    padding: '11px 20px',
    borderBottom: '1px solid rgba(255,255,255,.035)',
  }

  return (
    <section style={containerStyle} aria-label={t('trending.title')}>
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
          {t('trending.title')}
        </h2>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          {t('trending.subtitle', { n: TRENDING_TOP_N })}
        </span>
      </div>

      {cards.length === 0 ? (
        <EmptyState message={t('trending.empty')} />
      ) : (
        <>
          <div style={{ ...rowStyle, borderBottom: '1px solid var(--border-hair)' }}>
            <span style={headerCellStyle}>{t('trending.col.rank')}</span>
            <span style={headerCellStyle}>{t('trending.col.card')}</span>
            <span style={{ ...headerCellStyle, textAlign: 'right' }}>{t('trending.col.current')}</span>
            {showDelta && (
              <>
                <span style={{ ...headerCellStyle, textAlign: 'right' }}>{t('trending.col.previous')}</span>
                <span style={{ ...headerCellStyle, textAlign: 'right' }}>{t('trending.col.change')}</span>
              </>
            )}
          </div>

          {cards.map((card, i) => (
            <div key={`${i}-${card.cardName}`} style={rowStyle}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>
                <TrendingCardName card={card} />
              </span>
              <span style={numCellStyle}>{card.sharePct.toFixed(1)}%</span>
              {showDelta && (
                <>
                  <span style={{ ...numCellStyle, color: 'var(--text-muted)' }}>
                    {card.delta ? `${card.delta.prevPct.toFixed(1)}%` : ''}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <ShareDelta delta={card.delta} labelKeyPrefix="trending.change" />
                  </span>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  )
}
