import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { DeckCard } from './DeckCard'
import type { DeckRow } from '../lib/deckSelection'

const deck: DeckRow = {
  sourceDeckId: '863982',
  player: 'Norbspro',
  placement: '3-4',
  eventName: 'RCQ',
  eventDate: '2026-06-20',
  archetypeName: 'Izzet Control',
  colorIdentity: 'UR',
}

describe('DeckCard', () => {
  it('shows the placement badge label, player, event, and color pips', () => {
    render(<DeckCard deck={deck} />)
    expect(screen.getByText('Top 4')).toBeInTheDocument()
    expect(screen.getByText('Norbspro')).toBeInTheDocument()
    expect(screen.getByText('RCQ')).toBeInTheDocument()
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(2)
  })

  it('is a button with the view-deck CTA that calls onSelect', () => {
    const onSelect = vi.fn()
    render(<DeckCard deck={deck} onSelect={onSelect} />)
    expect(screen.getByText(/go to deck/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(deck)
  })

  it('is not a button (and shows no CTA) when no onSelect is given', () => {
    render(<DeckCard deck={deck} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText(/go to deck/)).toBeNull()
  })
})
