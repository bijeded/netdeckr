import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { TierSelector } from './TierSelector'

afterEach(() => i18n.changeLanguage('en'))

describe('TierSelector', () => {
  it('offers All tiers plus one option per tier, labelled', () => {
    render(<TierSelector value={null} onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Tiers' })
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['All tiers', 'Tier 1', 'Tier 2', 'Tier 3', 'Rogue'])
  })

  it('emits the selected tier, and null for the All default', () => {
    const onChange = vi.fn()
    render(<TierSelector value={null} onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: 'Tiers' })

    fireEvent.change(select, { target: { value: 'T1' } })
    expect(onChange).toHaveBeenCalledWith('T1')

    fireEvent.change(select, { target: { value: 'Otros' } })
    expect(onChange).toHaveBeenCalledWith('Otros')

    fireEvent.change(select, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('reflects the current value', () => {
    render(<TierSelector value="T2" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('T2')
  })

  it('localizes the heading, default, and Rogue/Otros label in Spanish', () => {
    i18n.changeLanguage('es')
    render(<TierSelector value={null} onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Tiers' })
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    // "Tiers" heading/label is shared; the default and the fringe label localize.
    expect(options).toEqual(['Todos los tiers', 'Tier 1', 'Tier 2', 'Tier 3', 'Otros'])
  })
})
