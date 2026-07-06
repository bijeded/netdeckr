import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { ArchetypeSelector } from './ArchetypeSelector'

afterEach(() => i18n.changeLanguage('en'))

const ARCHETYPES = ['Izzet Cauldron', 'Mono Red Aggro']

describe('ArchetypeSelector', () => {
  it('renders an "All archetypes" default option plus one per archetype', () => {
    render(<ArchetypeSelector value={null} archetypes={ARCHETYPES} onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Archetype' })
    const options = within(select).getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('All archetypes')
  })

  it('keeps archetype proper nouns verbatim in English', () => {
    render(<ArchetypeSelector value={null} archetypes={ARCHETYPES} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'Izzet Cauldron' })).toBeInTheDocument()
  })

  it('reflects the selected archetype as the current value', () => {
    render(<ArchetypeSelector value="Izzet Cauldron" archetypes={ARCHETYPES} onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Archetype' })).toHaveValue('Izzet Cauldron')
  })

  it('calls onChange with the archetype name when one is picked', () => {
    const onChange = vi.fn()
    render(<ArchetypeSelector value={null} archetypes={ARCHETYPES} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
      target: { value: 'Mono Red Aggro' },
    })
    expect(onChange).toHaveBeenCalledWith('Mono Red Aggro')
  })

  it('calls onChange with null when "All archetypes" is picked', () => {
    const onChange = vi.fn()
    render(<ArchetypeSelector value="Izzet Cauldron" archetypes={ARCHETYPES} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows a localized group heading', async () => {
    render(<ArchetypeSelector value={null} archetypes={ARCHETYPES} onChange={() => {}} />)
    expect(screen.getByText('Archetype')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByText('Arquetipo')).toBeInTheDocument()
  })
})
