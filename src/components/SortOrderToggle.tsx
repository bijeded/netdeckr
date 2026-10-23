import { useTranslation } from 'react-i18next'
import { SORT_ORDERS, type SortOrder } from '../lib/sortOrder'

interface SortOrderToggleProps {
  value: SortOrder
  onChange: (order: SortOrder) => void
  /** Rendered but inert (e.g. while one archetype is isolated), so the row never reflows. */
  disabled?: boolean
}

/**
 * The grid's Popular / Power order switch: a two-option segmented control. It
 * reorders the same grid rather than switching panels, so it is a group of
 * toggle buttons (`aria-pressed`), not a tab list like the archetype tab toggle.
 */
export function SortOrderToggle({ value, onChange, disabled = false }: SortOrderToggleProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('dashboard.sortLabel')} className="tab-toggle sort-toggle" data-testid="sort-order">
      {SORT_ORDERS.map((order) => (
        <button
          key={order}
          type="button"
          data-testid={`sort-order-${order}`}
          className="tab-toggle-option"
          aria-pressed={order === value}
          disabled={disabled}
          onClick={() => onChange(order)}
        >
          {t(order === 'power' ? 'dashboard.sortPower' : 'dashboard.sortPopular')}
        </button>
      ))}
    </div>
  )
}
