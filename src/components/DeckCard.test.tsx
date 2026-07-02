import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { DeckCard } from './DeckCard'
import type { DeckRow } from '../lib/deckSelection'

const deck: DeckRow = {
  id: 7,
  sourceDeckId: '863982',
  player: 'Norbspro',
  placement: '3-4',
  eventName: 'RCQ',
  eventDate: '2026-06-20',
  archetypeName: 'Izzet Control',
  colorIdentity: 'UR',
}

describe('DeckCard', () => {
  it('shows the placement badge label, player, and event (no color pips)', () => {
    render(<DeckCard deck={deck} />)
    expect(screen.getByText('Top 4')).toBeInTheDocument()
    expect(screen.getByText('Norbspro')).toBeInTheDocument()
    expect(screen.getByText('RCQ')).toBeInTheDocument()
    expect(screen.queryAllByTestId('mana-pip')).toHaveLength(0)
  })

  it('is always a button; clicking calls onSelect when provided', () => {
    const onSelect = vi.fn()
    render(<DeckCard deck={deck} onSelect={onSelect} />)
    expect(screen.getByText(/go to deck/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(deck)
  })

  it('is still a button without onSelect (CTA hidden, click is a no-op)', () => {
    render(<DeckCard deck={deck} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.queryByText(/go to deck/)).toBeNull()
    fireEvent.click(button) // does not throw
  })
})
