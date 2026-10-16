import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import type { ConsensusRow } from '../lib/stockList'

interface ConsensusTableProps {
  title: string
  rows: ConsensusRow[]
  /** Analysed decks — the denominator of each row's "played" count. */
  deckCount: number
  testId: string
  smallSample?: boolean
}

/** Rows per page; the tables otherwise run to every card the archetype has ever played. */
export const CONSENSUS_PAGE_SIZE = 10

/**
 * Every card the archetype's decks ran on one board, ordered by the stock-list
 * ranking, with its band (core / flex / spicy), plain inclusion, and average
 * copies — paged ten rows at a time.
 */
export function ConsensusTable({ title, rows, deckCount, testId, smallSample }: ConsensusTableProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / CONSENSUS_PAGE_SIZE))
  // A new archetype (or a refetch) brings new rows: start again from the top.
  useEffect(() => setPage(0), [rows])
  const visible = rows.slice(page * CONSENSUS_PAGE_SIZE, (page + 1) * CONSENSUS_PAGE_SIZE)

  return (
    <section className="analysis-panel" aria-label={title} data-testid={testId}>
      <header className="analysis-panel-header">
        <div className="analysis-panel-titles">
          <h3 className="analysis-panel-title">{title}</h3>
          {smallSample && (
            <span className="analysis-badge" data-testid="small-sample" title={t('analysis.smallSampleHint')}>
              {t('analysis.smallSample')}
            </span>
          )}
        </div>
      </header>
      <table className="analysis-table">
        <thead>
          <tr>
            <th scope="col">{t('analysis.composition.card')}</th>
            <th scope="col" className="analysis-num">
              {t('analysis.composition.played')}
            </th>
            <th scope="col" className="analysis-num">
              {t('trending.col.avg')}
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.name} className={`analysis-row analysis-band-${row.band}`} data-band={row.band}>
              <td>
                <span className="analysis-card-cell">
                  <span className="analysis-band-chip">{t(`analysis.composition.bands.${row.band}`)}</span>
                  <CardArtPreview name={row.name} imageUrl={row.imageUrl} />
                </span>
              </td>
              <td className="analysis-num analysis-figure">
                {Math.round(row.inclusionPct)}%
                <span className="analysis-figure-sub">
                  {row.decks}/{deckCount}
                </span>
              </td>
              <td className="analysis-num analysis-figure">{row.avgCopies.toFixed(1)}x</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <nav className="analysis-pager" aria-label={t('analysis.composition.pagerLabel', { table: title })}>
          <button
            type="button"
            className="analysis-pager-button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            aria-label={t('analysis.composition.prevPage')}
          >
            ←
          </button>
          <span className="analysis-pager-status" aria-live="polite">
            {t('analysis.composition.pageOf', { page: page + 1, pages })}
          </span>
          <button
            type="button"
            className="analysis-pager-button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === pages - 1}
            aria-label={t('analysis.composition.nextPage')}
          >
            →
          </button>
        </nav>
      )}
    </section>
  )
}
