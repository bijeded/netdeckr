import { useTranslation } from 'react-i18next'

interface ArchetypeSelectorProps {
  /** Selected archetype name, or null for "All archetypes". */
  value: string | null
  archetypes: string[]
  onChange: (archetypeName: string | null) => void
}

/**
 * Sidebar filter: single-archetype select. An "All archetypes" default plus one
 * option per archetype in the current filtered view. Archetype names are proper
 * nouns — kept verbatim (English) in both locales.
 */
export function ArchetypeSelector({ value, archetypes, onChange }: ArchetypeSelectorProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-labelledby="archetype-filter-heading">
      <div
        id="archetype-filter-heading"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--track-wide)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {t('filters.archetype')}
      </div>
      <select
        aria-label={t('filters.archetype')}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
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
        <option value="">{t('filters.allArchetypes')}</option>
        {archetypes.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
