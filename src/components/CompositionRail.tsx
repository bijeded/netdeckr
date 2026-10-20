import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, XAxis } from 'recharts'
import type { CardType } from '../lib/cardType'
import { WILDCARD_RARITIES, type CurvePoint, type TypeSplitPoint, type WildcardCost } from '../lib/archetypeAnalysis'

interface CompositionRailProps {
  curve: CurvePoint[]
  types: TypeSplitPoint[]
  /** null outside Arena formats — the wildcard block is then not rendered. */
  wildcards: WildcardCost | null
  smallSample: boolean
}


/** Slice colour for a card type — the same token its legend dot uses. */
const typeColor = (type: CardType) => `var(--type-${type})`

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
        {/* A small doughnut beside its legend, so it fits the 280px rail and the
            phone column without growing the rail's height. */}
        <div className="analysis-types">
          <div className="analysis-doughnut" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={types.filter((p) => p.count > 0)}
                  dataKey="count"
                  nameKey="type"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {types
                    .filter((p) => p.count > 0)
                    .map((p) => (
                      <Cell key={p.type} fill={typeColor(p.type)} />
                    ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="analysis-doughnut-total">{typeTotal}</span>
          </div>
          <ul className="analysis-legend">
            {types
              .filter((p) => p.count > 0)
              .map((p) => (
                <li key={p.type}>
                  <span className={`analysis-legend-dot analysis-type-${p.type}`} aria-hidden="true" />
                  <span>{t(`analysis.composition.types.${p.type}`)}</span>
                  <span className="analysis-figure">{p.count}</span>
                </li>
              ))}
          </ul>
        </div>
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
                {/* The pip colour carries the rarity on screen; the name stays for assistive tech. */}
                <span className="visually-hidden">{t(`analysis.composition.rarity.${rarity}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
