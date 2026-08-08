import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { EventSelector } from './EventSelector'
import type { EventOption } from '../hooks/useMetagame'
import type { ComponentProps } from 'react'

afterEach(() => i18n.changeLanguage('en'))

const EVENTS: EventOption[] = [
  { id: 10, name: 'RCQ Madrid', eventDate: '2026-07-05', playerCount: 128, deckCount: 8 },
  { id: 20, name: 'PTQ Lyon', eventDate: '2026-07-01', playerCount: null, deckCount: 5 },
]

/** The two size props are required; tests that don't exercise them take defaults. */
function renderSelector(props: Partial<ComponentProps<typeof EventSelector>> = {}) {
  return render(
    <EventSelector
      value={null}
      events={EVENTS}
      onChange={() => {}}
      sizeClass={null}
      onSizeClassChange={() => {}}
      {...props}
    />,
  )
}

describe('EventSelector', () => {
  it('renders an "All events" default option plus one per event', () => {
    renderSelector()
    const select = screen.getByRole('combobox', { name: 'Event' })
    const options = within(select).getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('All events')
  })

  it('labels each event with its name and abbreviated date', () => {
    renderSelector()
    // Abbreviated day + month (en-US renders "Jul 5").
    expect(screen.getByRole('option', { name: /RCQ Madrid/ })).toHaveTextContent(/Jul.*5|5.*Jul/)
  })

  it('appends the tournament size when known and omits it otherwise', () => {
    renderSelector()
    expect(screen.getByRole('option', { name: /RCQ Madrid/ })).toHaveTextContent('(128 players)')
    // PTQ Lyon has a null player count → no size parenthetical.
    expect(screen.getByRole('option', { name: /PTQ Lyon/ })).not.toHaveTextContent('players')
  })

  it('reflects the selected event id as the current value', () => {
    renderSelector({ value: 10 })
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('10')
  })

  it('calls onChange with the event id when one is picked', () => {
    const onChange = vi.fn()
    renderSelector({ onChange })
    fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '20' } })
    expect(onChange).toHaveBeenCalledWith(20)
  })

  it('calls onChange with null when "All events" is picked', () => {
    const onChange = vi.fn()
    renderSelector({ value: 10, onChange })
    fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows a localized group heading', async () => {
    renderSelector()
    expect(screen.getByText('Event')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByText('Evento')).toBeInTheDocument()
  })

  describe('nested event-size select', () => {
    it('renders inside the group with one heading, above the event select', () => {
      const { container } = renderSelector()
      // One group carrying one visible label — size and event read as a single
      // filter, not two. A second group or a second heading would break that.
      const groups = screen.getAllByRole('group')
      expect(groups).toHaveLength(1)
      expect(groups[0]).toHaveAccessibleName('Event')
      expect(screen.getAllByText('Event')).toHaveLength(1)

      const selects = Array.from(container.querySelectorAll('select'))
      expect(selects).toHaveLength(2)
      expect(selects[0]).toHaveAccessibleName('Event size')
      expect(selects[1]).toHaveAccessibleName('Event')
    })

    it('is identifiable by an accessible name despite having no visible label', () => {
      renderSelector()
      // No visible "Event size" text — the name exists only for assistive tech.
      expect(screen.queryByText('Event size')).not.toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Event size' })).toBeInTheDocument()
    })

    it('offers the default plus the five size classes', () => {
      renderSelector()
      const select = screen.getByRole('combobox', { name: 'Event size' })
      const options = within(select).getAllByRole('option')
      expect(options).toHaveLength(6)
      expect(options[0]).toHaveTextContent('All event sizes')
      expect(options.map((o) => o.getAttribute('value'))).toEqual([
        '',
        'small',
        'medium',
        'large',
        'massive',
        'unsized',
      ])
    })

    it('reflects and reports the selected size class', () => {
      const onSizeClassChange = vi.fn()
      renderSelector({ sizeClass: 'large', onSizeClassChange })
      const select = screen.getByRole('combobox', { name: 'Event size' })
      expect(select).toHaveValue('large')

      fireEvent.change(select, { target: { value: 'massive' } })
      expect(onSizeClassChange).toHaveBeenCalledWith('massive')
    })

    it('reports null when the default is picked', () => {
      const onSizeClassChange = vi.fn()
      renderSelector({ sizeClass: 'small', onSizeClassChange })
      fireEvent.change(screen.getByRole('combobox', { name: 'Event size' }), {
        target: { value: '' },
      })
      expect(onSizeClassChange).toHaveBeenCalledWith(null)
    })

    it('localizes its labels and accessible name', async () => {
      renderSelector()
      await act(() => i18n.changeLanguage('es'))
      const select = screen.getByRole('combobox', { name: 'Tamaño del evento' })
      expect(within(select).getAllByRole('option')[0]).toHaveTextContent('Todos los tamaños')
    })
  })
})
