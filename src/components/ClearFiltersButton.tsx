import { useTranslation } from 'react-i18next'

interface ClearFiltersButtonProps {
  /** True when no filter is active — the button is inert. */
  disabled: boolean
  onClear: () => void
}

/** Sidebar control: resets the event + archetype filters to their defaults. */
export function ClearFiltersButton({ disabled, onClear }: ClearFiltersButtonProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClear}
      style={{
        width: '100%',
        textAlign: 'center',
        padding: '9px 13px',
        borderRadius: 'var(--r-md)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs-sm)',
        cursor: disabled ? 'default' : 'pointer',
        border: '1px solid var(--border-line)',
        background: 'transparent',
        color: disabled ? 'var(--text-faint)' : 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--dur) var(--ease)',
      }}
    >
      {t('filters.clear')}
    </button>
  )
}
