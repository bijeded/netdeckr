import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'

describe('Spinner', () => {
  it('exposes an accessible status role with the given label', () => {
    render(<Spinner label="Loading" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', 'Loading')
  })
})

describe('EmptyState', () => {
  it('renders the message and a frowny face', () => {
    render(<EmptyState message="No data yet" />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })
})
