import { useTranslation } from 'react-i18next'
import type { Tier } from '../lib/tiers'

interface TierSelectorProps {
  /** Selected tier, or null for "All tiers". */
  value: Tier | null
  onChange: (tier: Tier | null) => void
}

/** The four tiers in display order; the fringe tier reuses the shared "Rogue"/"Otros" label. */
const TIER_ORDER: Tier[] = ['T1', 'T2', 'T3', 'Otros']

/**
 * Sidebar filter: single-tier select. An "All tiers" default plus one option per
 * performance tier (T1/T2/T3 → "Tier 1/2/3", Otros → the localized "Rogue"/"Otros"
 * fringe label). Selecting a tier restricts the grid to that tier's archetypes.
 */
export function TierSelector({ value, onChange }: TierSelectorProps) {
  const { t } = useTranslation()
  const labelFor = (tier: Tier) =>
    tier === 'Otros' ? t('tiers.rogue') : t('filters.tierLabel', { n: Number(tier.slice(1)) })
  return (
    <div role="group" aria-labelledby="tier-filter-heading">
      <div
        id="tier-filter-heading"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--track-wide)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {t('filters.tiers')}
      </div>
      <select
        aria-label={t('filters.tiers')}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as Tier))}
        style={{
          width: '100%',
          padding: '9px 13px',
          borderRadius: 'var(--r-md)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-sm)',
          cursor: 'pointer',
          border: '1px solid var(--border-line)',
          background: 'var(--surface-faint)',
          color: 'var(--text-secondary)',
        }}
      >
        <option value="">{t('filters.allTiers')}</option>
        {TIER_ORDER.map((tier) => (
          <option key={tier} value={tier}>
            {labelFor(tier)}
          </option>
        ))}
      </select>
    </div>
  )
}
