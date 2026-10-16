import { useTranslation } from 'react-i18next'
import type { EventOption } from '../hooks/useMetagame'
import { eventLabel } from '../lib/eventLabel'
import { EventSizeSelector } from './EventSizeSelector'
import { selectBase } from './selectBase'
import type { EventSizeClass } from '../lib/eventSize'

interface EventSelectorProps {
  /** Selected event id, or null for "All events". */
  value: number | null
  events: EventOption[]
  onChange: (eventId: number | null) => void
  /** Selected event size class, or null for "All event sizes". */
  sizeClass: EventSizeClass | null
  onSizeClassChange: (sizeClass: EventSizeClass | null) => void
  /**
   * Disables the event select (the Players view ignores the event filter). The
   * selection is kept and shown, and applies again once re-enabled.
   */
  disabled?: boolean
}

/**
 * Sidebar filter: the Event group. One heading over two selects — event size
 * above, single event below — because they narrow the same axis at different
 * granularities; giving each its own heading would read as two unrelated
 * filters. The event list arrives already narrowed by the size class, so an
 * unreachable event is never offered.
 *
 * "All events" default plus one option per event in the current (format,
 * window), each labelled name + abbreviated date. Event names are proper nouns
 * — not localized.
 */
export function EventSelector({
  value,
  events,
  onChange,
  sizeClass,
  onSizeClassChange,
  disabled = false,
}: EventSelectorProps) {
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
      <EventSizeSelector value={sizeClass} onChange={onSizeClassChange} />
      <select
        aria-label={t('filters.event')}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        disabled={disabled}
        aria-describedby={disabled ? 'event-filter-off' : undefined}
        style={disabled ? { ...selectBase, cursor: 'default', opacity: 0.5 } : selectBase}
      >
        <option value="">{t('filters.allEvents')}</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {eventLabel(event, i18n.language, t)}
          </option>
        ))}
      </select>
      {disabled && (
        <div
          id="event-filter-off"
          style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' }}
        >
          {t('players.eventFilterOff')}
        </div>
      )}
    </div>
  )
}
