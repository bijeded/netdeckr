import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { DecklistBoards } from './DecklistBoards'

const main = [
  { quantity: 24, name: 'Island', scrapedName: 'Island', typeLine: 'Basic Land — Island' },
  { quantity: 4, name: 'Faerie', scrapedName: 'Faerie', typeLine: 'Creature — Faerie' },
  { quantity: 32, name: 'Counterspell', scrapedName: 'Counterspell', typeLine: 'Instant' },
]
const side = [{ quantity: 15, name: 'Negate', scrapedName: 'Negate', typeLine: 'Instant' }]

describe('DecklistBoards', () => {
  it('groups a synthetic mainboard by type with board totals in list view', () => {
    render(<DecklistBoards main={main} side={side} images={false} />)
    const headings = screen.getAllByTestId('card-group-heading').map((h) => h.textContent)
    expect(headings).toEqual(['Lands', 'Creatures', 'Spells'])
    expect(screen.getByText('60 cards')).toBeInTheDocument()
    expect(screen.getAllByText('15 cards').length).toBeGreaterThan(0)
    expect(screen.getByText('Negate')).toBeInTheDocument()
  })

  it('renders flat tile grids with the same totals in image view', () => {
    render(<DecklistBoards main={main} side={side} images />)
    expect(screen.queryByTestId('card-group-heading')).toBeNull()
    expect(screen.getByText('60 cards')).toBeInTheDocument()
  })
})
