import { useTranslation } from 'react-i18next'
import { CardArtPreview } from './CardArtPreview'
import type { ConsensusRow } from '../lib/stockList'

interface ConsensusTableProps {
  title: string
  hint?: string
  rows: ConsensusRow[]
  /** Analysed decks — the denominator of each row's "played" count. */
  deckCount: number
  testId: string
  smallSample?: boolean
}

/**
 * Every card the archetype's decks ran on one board, ordered by the stock-list
 * ranking: band rail (core / flex / spicy), plain inclusion, average copies,
 * and a ✓ on cards that made the stock list.
 */
export function ConsensusTable({ title, hint, rows, deckCount, testId, smallSample }: ConsensusTableProps) {
  const { t } = useTranslation()
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
        {hint && <span className="analysis-panel-subtitle analysis-panel-hint">{hint}</span>}
      </header>
      <table className="analysis-table">
        <thead>
          <tr>
            <th scope="col">{t('analysis.composition.card')}</th>
            <th scope="col" className="analysis-num">
              {t('analysis.composition.played')}
            </th>
            <th scope="col" className="analysis-num">
              {t('analysis.composition.copies')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className={`analysis-row analysis-band-${row.band}`} data-band={row.band}>
              <td>
                <span className="analysis-card-cell">
                  <span className="analysis-band-chip">{t(`analysis.composition.bands.${row.band}`)}</span>
                  <CardArtPreview name={row.name} imageUrl={row.imageUrl} />
                  {row.inStock && (
                    <span className="analysis-in-stock" data-testid="in-stock" title={t('analysis.composition.inStock')}>
                      <span aria-hidden="true">✓</span>
                      <span className="visually-hidden">{t('analysis.composition.inStock')}</span>
                    </span>
                  )}
                </span>
              </td>
              <td className="analysis-num">
                <span className="analysis-inclusion">
                  <span className="analysis-bar-track analysis-inclusion-track">
                    <span className="analysis-bar analysis-bar-inclusion" style={{ width: `${row.inclusionPct}%` }} />
                  </span>
                  <span className="analysis-figure">
                    {Math.round(row.inclusionPct)}%
                    <span className="analysis-figure-sub">
                      {row.decks}/{deckCount}
                    </span>
                  </span>
                </span>
              </td>
              <td className="analysis-num analysis-figure">{row.avgCopies.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
