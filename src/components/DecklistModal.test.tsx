import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import type { DeckRow } from '../lib/deckSelection'

const useDeckCards = vi.fn()
vi.mock('../hooks/useDeckCards', () => ({ useDeckCards: (id: number | null) => useDeckCards(id) }))

import { DecklistModal } from './DecklistModal'

const deck: DeckRow = {
  id: 7,
  sourceDeckId: '863982',
  player: 'Norbspro',
  placement: '1',
  eventName: 'RCQ',
  eventDate: '2026-06-20',
  archetypeName: 'Izzet Control',
  colorIdentity: 'UR',
}

beforeEach(() => {
  vi.clearAllMocks()
  useDeckCards.mockReturnValue({
    main: [
      { quantity: 4, name: 'Island' },
      { quantity: 2, name: 'Opt' },
    ],
    side: [{ quantity: 3, name: 'Negate' }],
    mainCount: 6,
    sideCount: 3,
    loading: false,
    error: null,
  })
})

describe('DecklistModal', () => {
  it('renders as a dialog with the archetype, player, placement and card lists', () => {
    render(<DecklistModal deck={deck} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Izzet Control')).toBeInTheDocument()
    expect(screen.getByText('Norbspro')).toBeInTheDocument()
    expect(screen.getByText('1st')).toBeInTheDocument()
    expect(screen.getByText('Island')).toBeInTheDocument()
    expect(screen.getByText('Negate')).toBeInTheDocument()
    // Section counts.
    expect(screen.getByText('6 cards')).toBeInTheDocument()
    expect(screen.getByText('3 cards')).toBeInTheDocument()
  })

  it('fetches cards for the deck id', () => {
    render(<DecklistModal deck={deck} onClose={vi.fn()} />)
    expect(useDeckCards).toHaveBeenCalledWith(7)
  })

  it('closes on the close button, Escape, and backdrop click — but not on panel click', () => {
    const onClose = vi.fn()
    render(<DecklistModal deck={deck} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(2) // clicking the panel does not close

    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('moves focus to the close button on open and restores it on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<DecklistModal deck={deck} onClose={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('shows a loading state while cards load', () => {
    useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: true, error: null })
    render(<DecklistModal deck={deck} onClose={vi.fn()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state when the cards fail to load', () => {
    useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: { message: 'boom' } })
    render(<DecklistModal deck={deck} onClose={vi.fn()} />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
    // The dialog and header still render; only the body shows the error.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
