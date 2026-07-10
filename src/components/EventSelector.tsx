import { useTranslation } from 'react-i18next'
import type { EventOption } from '../hooks/useMetagame'
import { eventLabel } from '../lib/eventLabel'

interface EventSelectorProps {
  /** Selected event id, or null for "All events". */
  value: number | null
  events: EventOption[]
  onChange: (eventId: number | null) => void
}

/**
 * Sidebar filter: single-event select. An "All events" default plus one option
 * per event in the current (format, window), each labelled name + abbreviated
 * date. Event names are proper nouns — not localized.
 */
export function EventSelector({ value, events, onChange }: EventSelectorProps) {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-labelledby="event-filter-heading">
      <div
        id="event-filter-heading"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-2xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--track-wide)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {t('filters.event')}
      </div>
      <select
        aria-label={t('filters.event')}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
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
        <option value="">{t('filters.allEvents')}</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {eventLabel(event, i18n.language, t)}
          </option>
        ))}
      </select>
    </div>
  )
}
