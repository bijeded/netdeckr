import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { EventSelector } from './EventSelector'
import type { EventOption } from '../hooks/useMetagame'

afterEach(() => i18n.changeLanguage('en'))

const EVENTS: EventOption[] = [
  { id: 10, name: 'RCQ Madrid', eventDate: '2026-07-05', playerCount: 128, deckCount: 8 },
  { id: 20, name: 'PTQ Lyon', eventDate: '2026-07-01', playerCount: null, deckCount: 5 },
]

describe('EventSelector', () => {
  it('renders an "All events" default option plus one per event', () => {
    render(<EventSelector value={null} events={EVENTS} onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Event' })
    const options = within(select).getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('All events')
  })

  it('labels each event with its name and abbreviated date', () => {
    render(<EventSelector value={null} events={EVENTS} onChange={() => {}} />)
    // Abbreviated day + month (en-US renders "Jul 5").
    expect(screen.getByRole('option', { name: /RCQ Madrid/ })).toHaveTextContent(/Jul.*5|5.*Jul/)
  })

  it('appends the tournament size when known and omits it otherwise', () => {
    render(<EventSelector value={null} events={EVENTS} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: /RCQ Madrid/ })).toHaveTextContent('(128 players)')
    // PTQ Lyon has a null player count → no size parenthetical.
    expect(screen.getByRole('option', { name: /PTQ Lyon/ })).not.toHaveTextContent('players')
  })

  it('reflects the selected event id as the current value', () => {
    render(<EventSelector value={10} events={EVENTS} onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('10')
  })

  it('calls onChange with the event id when one is picked', () => {
    const onChange = vi.fn()
    render(<EventSelector value={null} events={EVENTS} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '20' } })
    expect(onChange).toHaveBeenCalledWith(20)
  })

  it('calls onChange with null when "All events" is picked', () => {
    const onChange = vi.fn()
    render(<EventSelector value={10} events={EVENTS} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows a localized group heading', async () => {
    render(<EventSelector value={null} events={EVENTS} onChange={() => {}} />)
    expect(screen.getByText('Event')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByText('Evento')).toBeInTheDocument()
  })
})
