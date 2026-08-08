import { useTranslation } from 'react-i18next'
import { EVENT_SIZE_CLASSES, type EventSizeClass } from '../lib/eventSize'
import { selectBase } from './selectBase'

interface EventSizeSelectorProps {
  /** Selected size class, or null for "All event sizes". */
  value: EventSizeClass | null
  onChange: (sizeClass: EventSizeClass | null) => void
}

/** Localization key per size class — explicit, so a renamed class fails to compile. */
const LABEL_KEY: Record<EventSizeClass, string> = {
  small: 'filters.sizeSmall',
  medium: 'filters.sizeMedium',
  large: 'filters.sizeLarge',
  massive: 'filters.sizeMassive',
  unsized: 'filters.sizeUnsized',
}

/**
 * Sidebar filter: event size class. Renders **inside** the Event group, above
 * the event select and under that group's single "Event" heading — size and
 * event are the same axis at two granularities, so they read as one filter.
 *
 * Having no heading of its own, this select would otherwise be announced as a
 * bare combobox indistinguishable from the event select beside it; the
 * `aria-label` is what keeps the two tellable apart non-visually.
 */
export function EventSizeSelector({ value, onChange }: EventSizeSelectorProps) {
  const { t } = useTranslation()
  return (
    <select
      aria-label={t('filters.eventSize')}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as EventSizeClass))}
      style={{ ...selectBase, marginBottom: 'var(--sp-3)' }}
    >
      <option value="">{t('filters.allEventSizes')}</option>
      {EVENT_SIZE_CLASSES.map((sizeClass) => (
        <option key={sizeClass} value={sizeClass}>
          {t(LABEL_KEY[sizeClass])}
        </option>
      ))}
    </select>
  )
}
