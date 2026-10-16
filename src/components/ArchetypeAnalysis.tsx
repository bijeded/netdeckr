import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DecklistBoards } from './DecklistBoards'
import { DecklistViewToggle } from './DecklistViewToggle'
import { DeckExportButton } from './DeckExportButton'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'
import { AnalysisPerformance } from './AnalysisPerformance'
import { ConsensusTable } from './ConsensusTable'
import { CompositionRail } from './CompositionRail'
import { useArchetypeCardStats } from '../hooks/useArchetypeCardStats'
import { useDeckExport } from '../hooks/useDeckExport'
import {
  analysePerformance,
  manaCurve,
  twoWeekDecks,
  typeSplit,
  wildcardCost,
  MIN_ANALYSIS_DECKS,
  type AnalysisDeck,
} from '../lib/archetypeAnalysis'
import { buildStockList, type WeightedDeckInput } from '../lib/stockList'
import type { FormatCode } from '../lib/formats'

interface ArchetypeAnalysisProps {
  format: FormatCode
  archetypeName: string
  /** The format's legal corpus, unfiltered — the analysis slices it to 2 weeks itself. */
  corpus: AnalysisDeck[]
  /** A sidebar filter other than the archetype is narrowing the Lists tab. */
  filtersActive: boolean
}

/** A small "Small sample" chip, shown on sections built from fewer than 5 decks. */
function SmallSampleBadge() {
  const { t } = useTranslation()
  return (
    <span className="analysis-badge" data-testid="small-sample" title={t('analysis.smallSampleHint')}>
      {t('analysis.smallSample')}
    </span>
  )
}

/**
 * The isolated archetype's Analysis tab: the format's full Last 2 Weeks, all
 * events, regardless of the sidebar. Performance comes from the loaded corpus;
 * the stock list and composition come from one card-stats request.
 */
export function ArchetypeAnalysis({ format, archetypeName, corpus, filtersActive }: ArchetypeAnalysisProps) {
  const { t } = useTranslation()
  const performance = useMemo(() => analysePerformance(corpus, archetypeName), [corpus, archetypeName])
  const ownDecks = useMemo(
    () => twoWeekDecks(corpus).filter((d) => d.archetypeName === archetypeName),
    [corpus, archetypeName],
  )
  const archetypeId = ownDecks.find((d) => d.archetypeId !== null)?.archetypeId ?? null
  const weighted: WeightedDeckInput[] = useMemo(
    () => ownDecks.map((d) => ({ id: d.id, placement: d.placement, playerCount: d.playerCount, unranked: d.unranked })),
    [ownDecks],
  )

  const cardStats = useArchetypeCardStats(format, archetypeId)
  const stock = useMemo(() => buildStockList(cardStats.rows, weighted), [cardStats.rows, weighted])
  const [images, setImages] = useState(false)
  const { target, exportDeck, notice } = useDeckExport(stock.main, stock.side, format, archetypeName)
  const curve = useMemo(() => manaCurve(stock.main), [stock.main])
  const types = useMemo(() => typeSplit(stock.main), [stock.main])
  const wildcards = useMemo(() => wildcardCost(stock.main, stock.side, format), [stock.main, stock.side, format])

  if (performance === null) return <EmptyState message={t('analysis.empty')} />

  const smallSample = performance.deckCount < MIN_ANALYSIS_DECKS
  const cardsReady = !cardStats.loading && !cardStats.error
  const cardsPending = cardStats.loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-8)' }}>
      <Spinner label={t('analysis.loading')} />
    </div>
  ) : cardStats.error ? (
    <EmptyState message={t('analysis.error')} />
  ) : null

  return (
    <div className="analysis" data-testid="archetype-analysis">
      <div className="analysis-scope">
        <span className="analysis-scope-label">{t('analysis.scope')}</span>
        <span className="analysis-scope-counts">
          {t('analysis.decksCount', { count: performance.deckCount })} ·{' '}
          {t('analysis.eventsCount', { count: performance.eventCount })}
        </span>
        {filtersActive && (
          <span className="analysis-scope-note" data-testid="analysis-filter-note">
            {t('analysis.filterNote')}
          </span>
        )}
      </div>

      <div className="analysis-stock-row">
        <section className="analysis-panel analysis-stock" aria-labelledby="analysis-stock-title" data-testid="stock-list">
          <header className="analysis-panel-header">
            <div className="analysis-panel-titles">
              <h3 id="analysis-stock-title" className="analysis-panel-title">
                {t('analysis.stock.title')}
              </h3>
              {cardsReady && (
                <span className="analysis-panel-subtitle">
                  {t('analysis.stock.subtitle', { count: stock.deckCount })}
                </span>
              )}
              {smallSample && <SmallSampleBadge />}
            </div>
            <div className="analysis-panel-actions">
              <DecklistViewToggle images={images} onToggle={() => setImages((on) => !on)} />
              <DeckExportButton target={target} disabled={!cardsReady || stock.main.length === 0} onExport={exportDeck} />
            </div>
            {notice && (
              <div
                role="alert"
                aria-live="polite"
                className="analysis-notice"
                style={{ color: notice.tone === 'error' ? 'var(--down)' : 'var(--up)' }}
              >
                {notice.message}
              </div>
            )}
          </header>
          {cardsPending ?? <DecklistBoards main={stock.main} side={stock.side} images={images} />}
        </section>
        {cardsReady && <CompositionRail curve={curve} types={types} wildcards={wildcards} smallSample={smallSample} />}
      </div>

      <AnalysisPerformance performance={performance} />

      {cardsReady ? (
        <div className="analysis-two-col">
          <ConsensusTable
            title={t('analysis.composition.consensusTitle')}
            hint={t('analysis.composition.consensusHint')}
            rows={stock.consensus}
            deckCount={stock.deckCount}
            testId="consensus-table"
            smallSample={smallSample}
          />
          <ConsensusTable
            title={t('analysis.composition.sideboardTitle')}
            rows={stock.sideboardPlan}
            deckCount={stock.deckCount}
            testId="sideboard-plan"
            smallSample={smallSample}
          />
        </div>
      ) : (
        <section className="analysis-panel" data-testid="composition-pending">
          {cardsPending}
        </section>
      )}
    </div>
  )
}
