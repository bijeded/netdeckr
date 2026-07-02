import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { DeckRow } from './DeckRow'
import type { DeckRow as Deck } from '../lib/deckSelection'

const deck: Deck = {
  sourceDeckId: '863982',
  player: 'Norbspro',
  placement: '1',
  eventName: 'RCQ',
  eventDate: '2026-06-20',
  archetypeName: 'Izzet Control',
  colorIdentity: 'UR',
}

describe('DeckRow', () => {
  it('shows placement, player, event, and color pips', () => {
    render(<DeckRow deck={deck} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Norbspro')).toBeInTheDocument()
    expect(screen.getByText(/RCQ/)).toBeInTheDocument()
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(2)
  })

  it('is a button that calls onSelect when provided', () => {
    const onSelect = vi.fn()
    render(<DeckRow deck={deck} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(deck)
  })

  it('is not a button when no onSelect is given', () => {
    render(<DeckRow deck={deck} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
