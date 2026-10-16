import { useTranslation } from 'react-i18next'
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from 'recharts'
import { WILDCARD_RARITIES, type CurvePoint, type TypeSplitPoint, type WildcardCost } from '../lib/archetypeAnalysis'

interface CompositionRailProps {
  curve: CurvePoint[]
  types: TypeSplitPoint[]
  /** null outside Arena formats — the wildcard block is then not rendered. */
  wildcards: WildcardCost | null
  smallSample: boolean
}

/**
 * The stock list's side rail: mana curve, card-type split, and (Arena formats
 * only) the wildcards needed to build it.
 */
export function CompositionRail({ curve, types, wildcards, smallSample }: CompositionRailProps) {
  const { t } = useTranslation()
  const typeTotal = types.reduce((s, p) => s + p.count, 0)

  return (
    <aside className="analysis-panel analysis-rail" data-testid="composition-rail">
      <div className="analysis-rail-block" data-testid="mana-curve">
        <div className="analysis-panel-titles">
          <h4 className="analysis-subtitle">{t('analysis.composition.curveTitle')}</h4>
          {smallSample && (
            <span className="analysis-badge" data-testid="small-sample" title={t('analysis.smallSampleHint')}>
              {t('analysis.smallSample')}
            </span>
          )}
        </div>
        <div className="analysis-curve" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={curve} margin={{ top: 18, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="analysis-curve-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon-500)" />
                  <stop offset="100%" stopColor="var(--neon-600)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="manaValue"
                tickLine={false}
                axisLine={{ stroke: 'var(--border-line)' }}
                tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
              />
              <Bar dataKey="count" fill="url(#analysis-curve-fill)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fill: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  formatter={(value: number) => (value > 0 ? value : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* The chart is decorative to assistive tech; this list carries the values. */}
        <ul className="visually-hidden">
          {curve.map((point) => (
            <li key={point.manaValue}>
              {t('analysis.composition.curveAxis')} {point.manaValue}: {point.count}
            </li>
          ))}
        </ul>
      </div>

      <div className="analysis-rail-block" data-testid="type-split">
        <h4 className="analysis-subtitle">{t('analysis.composition.typesTitle')}</h4>
        <div className="analysis-type-bar" aria-hidden="true">
          {types
            .filter((p) => p.count > 0)
            .map((p) => (
              <span
                key={p.category}
                className={`analysis-type-seg analysis-type-${p.category}`}
                style={{ flexGrow: p.count }}
              />
            ))}
        </div>
        <ul className="analysis-legend">
          {types
            .filter((p) => p.count > 0)
            .map((p) => (
              <li key={p.category}>
                <span className={`analysis-legend-dot analysis-type-${p.category}`} aria-hidden="true" />
                <span>{t(`modal.group.${p.category}`)}</span>
                <span className="analysis-figure">{p.count}</span>
              </li>
            ))}
        </ul>
        <span className="visually-hidden">{t('analysis.composition.cards', { count: typeTotal })}</span>
      </div>

      {wildcards && (
        <div className="analysis-rail-block" data-testid="wildcards">
          <h4 className="analysis-subtitle">{t('analysis.composition.wildcardsTitle')}</h4>
          <ul className="analysis-wildcards">
            {WILDCARD_RARITIES.map((rarity) => (
              <li key={rarity} className="analysis-wildcard" data-rarity={rarity}>
                <span className={`analysis-wildcard-pip analysis-rarity-${rarity}`} aria-hidden="true" />
                <span className="analysis-wildcard-count">{wildcards[rarity]}</span>
                <span className="analysis-wildcard-label">{t(`analysis.composition.rarity.${rarity}`)}</span>
              </li>
            ))}
          </ul>
          <p className="analysis-muted">{t('analysis.composition.wildcardsApprox')}</p>
        </div>
      )}
    </aside>
  )
}
