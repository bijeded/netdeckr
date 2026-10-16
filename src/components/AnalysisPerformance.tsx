import { useTranslation } from 'react-i18next'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatCard } from './StatCard'
import type { FunnelBucket, Performance } from '../lib/archetypeAnalysis'
import type { EventSizeClass } from '../lib/eventSize'
import { formatShortDate } from '../lib/formatDate'

interface AnalysisPerformanceProps {
  performance: Performance
}

/** Finish labels stay in English in both locales, like the deck-row placement badges. */
const FUNNEL_LABEL: Record<Exclude<FunnelBucket, 'deeper'>, string> = {
  first: '1st',
  second: '2nd',
  top4: 'Top 4',
  top8: 'Top 8',
}

const SIZE_LABEL_KEY: Record<EventSizeClass, string> = {
  small: 'filters.sizeSmall',
  medium: 'filters.sizeMedium',
  large: 'filters.sizeLarge',
  massive: 'filters.sizeMassive',
  unsized: 'filters.sizeUnsized',
}

const pct = (value: number) => `${value.toFixed(1)}%`


/**
 * The Analysis tab's performance section: headline figures, the placement
 * funnel over ranked events, a per-event-size breakdown, and share per day.
 * Every series arrives pre-shaped from lib/archetypeAnalysis.
 */
export function AnalysisPerformance({ performance }: AnalysisPerformanceProps) {
  const { t, i18n } = useTranslation()
  const funnelMax = Math.max(1, ...performance.funnel.map((p) => p.count))

  return (
    <section className="analysis-panel" aria-labelledby="analysis-performance-title" data-testid="analysis-performance">
      <header className="analysis-panel-header">
        <h3 id="analysis-performance-title" className="analysis-panel-title">
          {t('analysis.performance.title')}
        </h3>
      </header>
      <div className="analysis-panel-body">
        {/* The same readouts as the header strip. Six, not seven: the event count
            already sits in the tab's scope line. */}
        <div className="analysis-stats" data-testid="analysis-stats">
          <StatCard label={t('analysis.performance.share')} value={pct(performance.sharePct)} />
          <StatCard
            label={t('analysis.performance.tier')}
            value={performance.tier === 'Otros' ? t('tiers.rogue') : performance.tier}
          />
          <StatCard label={t('analysis.performance.power')} value={String(Math.round(performance.powerScore))} />
          <StatCard
            label={t('analysis.performance.top8')}
            value={performance.top8Rate === null ? '–' : `${Math.round(performance.top8Rate)}%`}
          />
          <StatCard label={t('analysis.performance.wins')} value={String(performance.wins)} />
          <StatCard label={t('analysis.performance.decks')} value={String(performance.deckCount)} />
        </div>

        <div className="analysis-perf-grid">
          <div>
            <h4 className="analysis-subtitle">{t('analysis.performance.funnelTitle')}</h4>
            {performance.rankedDecks === 0 ? (
              <p className="analysis-muted">{t('analysis.performance.noRanked')}</p>
            ) : (
              <ol className="analysis-funnel" data-testid="analysis-funnel">
                {performance.funnel.map((point) => (
                  <li key={point.bucket} className="analysis-funnel-row">
                    <span className="analysis-funnel-label">
                      {point.bucket === 'deeper' ? t('analysis.performance.deeper') : FUNNEL_LABEL[point.bucket]}
                    </span>
                    <span className="analysis-bar-track">
                      <span
                        className={`analysis-bar analysis-bar-${point.bucket}`}
                        style={{ width: `${(point.count / funnelMax) * 100}%` }}
                      />
                    </span>
                    <span className="analysis-figure">{point.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h4 className="analysis-subtitle">{t('analysis.performance.bySizeTitle')}</h4>
            <ul className="analysis-size-list" data-testid="analysis-by-size">
              {performance.bySize.map((point) => (
                <li key={point.sizeClass} className="analysis-size-row">
                  <span className="analysis-size-label">{t(SIZE_LABEL_KEY[point.sizeClass])}</span>
                  <span className="analysis-figure">{t('analysis.decksCount', { count: point.decks })}</span>
                  <span className="analysis-bar-track" title={t('analysis.performance.avgFinish')}>
                    <span className="analysis-bar analysis-bar-finish" style={{ width: `${point.avgFinish ?? 0}%` }} />
                  </span>
                  <span className="analysis-figure">
                    {point.avgFinish === null ? '–' : Math.round(point.avgFinish)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="analysis-subtitle">{t('analysis.performance.sharePerDayTitle')}</h4>
          <div className="analysis-sparkline" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance.sharePerDay} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="analysis-share-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--neon-500)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--neon-600)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  cursor={{ stroke: 'var(--neon-border)' }}
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-line)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  itemStyle={{ color: 'var(--neon-text-soft)' }}
                  labelFormatter={(date: string) => formatShortDate(date, i18n.language)}
                  formatter={(value: number | null) => [
                    value === null ? t('analysis.performance.noEvents') : pct(value),
                    t('analysis.performance.share'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sharePct"
                  stroke="var(--neon-500)"
                  strokeWidth={2}
                  fill="url(#analysis-share-fill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
