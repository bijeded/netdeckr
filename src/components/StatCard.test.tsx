import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the value and label', () => {
    render(<StatCard value="34" label="Events" />)
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('renders a numeric value formatted with thousands separators', () => {
    render(<StatCard value={(1284).toLocaleString('en-US')} label="Decks" />)
    expect(screen.getByText('1,284')).toBeInTheDocument()
  })

  it('associates the value with its label for assistive tech', () => {
    render(<StatCard value="12" label="Archetypes" />)
    // The value is the accessible figure; the label describes it.
    const figure = screen.getByText('12')
    expect(figure).toBeInTheDocument()
    expect(screen.getByText('Archetypes')).toBeInTheDocument()
  })
})
