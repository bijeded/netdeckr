import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('is not interactive without an open handler', () => {
    render(<StatCard value="34" label="Events" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders no extra line when its filter is at the All default', () => {
    const { container } = render(<StatCard value="34" label="Events" onOpen={() => {}} />)
    expect(container.querySelector('.stat-card-active')).toBeNull()
  })

  it('opens its modal when activated, and reports the modal state', () => {
    const onOpen = vi.fn()
    const { rerender } = render(<StatCard value="34" label="Events" onOpen={onOpen} />)
    const card = screen.getByRole('button', { name: /Events/ })
    expect(card).toHaveAttribute('aria-haspopup', 'dialog')
    expect(card).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalled()

    rerender(<StatCard value="34" label="Events" onOpen={onOpen} open />)
    expect(screen.getByRole('button', { name: /Events/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('names its active filter under the label', () => {
    render(<StatCard value="12" label="Decks" onOpen={() => {}} activeFilter="Tier 2" />)
    expect(screen.getByText('Tier 2')).toBeInTheDocument()
  })

  it('truncates a long active filter instead of growing the card', () => {
    const long = 'Regional Championship Milan — 12 Oct 2025 (642 players)'
    const { container } = render(<StatCard value="12" label="Events" onOpen={() => {}} activeFilter={long} />)
    const line = container.querySelector('.stat-card-active')
    // The class carries the ellipsis rule; the full value stays in the title.
    expect(line).toHaveAttribute('title', long)
    expect(line).toHaveTextContent(long)
  })
})
