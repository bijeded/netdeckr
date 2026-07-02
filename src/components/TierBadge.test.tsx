import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

describe('TierBadge', () => {
  it('renders the tier for a given share %', () => {
    render(<TierBadge pct={14.2} />)
    expect(screen.getByText('T1')).toBeInTheDocument()
  })

  it('renders an explicit tier when provided', () => {
    render(<TierBadge tier="T2" />)
    expect(screen.getByText('T2')).toBeInTheDocument()
  })

  it('localizes the fringe tier as "Rogue" in English', () => {
    render(<TierBadge tier="Otros" />)
    expect(screen.getByText('Rogue')).toBeInTheDocument()
    expect(screen.queryByText('Otros')).toBeNull()
  })
})
