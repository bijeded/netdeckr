import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
      { quantity: 4, name: 'Island', typeLine: 'Basic Land — Island' },
      { quantity: 2, name: 'Opt', typeLine: 'Instant' },
    ],
    side: [{ quantity: 3, name: 'Negate', typeLine: 'Instant' }],
    mainCount: 6,
    sideCount: 3,
    loading: false,
    error: null,
  })
})

describe('DecklistModal', () => {
  it('renders as a dialog with the archetype, player, placement and card lists', () => {
    render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
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

  describe('mainboard grouped by card type', () => {
    it('shows a heading for each non-empty type group in fixed order', () => {
      useDeckCards.mockReturnValue({
        main: [
          { quantity: 4, name: 'Island', typeLine: 'Basic Land — Island' },
          { quantity: 4, name: 'Snapcaster Mage', typeLine: 'Creature — Human Wizard' },
          { quantity: 2, name: 'Opt', typeLine: 'Instant' },
          { quantity: 3, name: 'Aether Spellbomb', typeLine: 'Artifact' },
        ],
        side: [{ quantity: 3, name: 'Negate', typeLine: 'Instant' }],
        mainCount: 13,
        sideCount: 3,
        loading: false,
        error: null,
      })
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      const headings = screen.getAllByTestId('card-group-heading').map((el) => el.textContent)
      expect(headings).toEqual(['Lands', 'Creatures', 'Spells', 'Other'])
    })

    it('hides the heading for an empty type group', () => {
      // Default mock has only a Land and an Instant — no creatures, no other.
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      expect(screen.getByText('Lands')).toBeInTheDocument()
      expect(screen.getByText('Spells')).toBeInTheDocument()
      expect(screen.queryByText('Creatures')).not.toBeInTheDocument()
      expect(screen.queryByText('Other')).not.toBeInTheDocument()
    })

    it('places a card with an unresolved type line into Other', () => {
      useDeckCards.mockReturnValue({
        main: [{ quantity: 1, name: 'Embiggen', typeLine: null }],
        side: [],
        mainCount: 1,
        sideCount: 0,
        loading: false,
        error: null,
      })
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      expect(screen.getByText('Other')).toBeInTheDocument()
      expect(screen.getByText('Embiggen')).toBeInTheDocument()
    })

    it('does not group the sideboard', () => {
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      // The sideboard's Instant does not create a second "Spells" group heading.
      expect(screen.getAllByText('Spells')).toHaveLength(1)
      expect(screen.getByText('Negate')).toBeInTheDocument()
    })
  })

  it('fetches cards for the deck id', () => {
    render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
    expect(useDeckCards).toHaveBeenCalledWith(7)
  })

  it('closes on the close button, Escape, and backdrop click — but not on panel click', () => {
    const onClose = vi.fn()
    render(<DecklistModal deck={deck} format="ST" onClose={onClose} />)

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

    const { unmount } = render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('shows a loading state while cards load', () => {
    useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: true, error: null })
    render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state when the cards fail to load', () => {
    useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: { message: 'boom' } })
    render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
    // The dialog and header still render; only the body shows the error.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  describe('MTG Arena export', () => {
    it('copies Arena text to the clipboard and confirms for an Arena format (Standard)', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /export to mtg arena/i }))

      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
      expect(writeText).toHaveBeenCalledWith('About\nName Izzet Control\n\nDeck\n4 Island\n2 Opt\n\nSideboard\n3 Negate')
      expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument()
      vi.unstubAllGlobals()
    })

    it('surfaces an error message when the clipboard write fails', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /export to mtg arena/i }))

      expect(await screen.findByText(/could not copy/i)).toBeInTheDocument()
      vi.unstubAllGlobals()
    })

    it('downloads a .txt file for a non-Arena format (Modern)', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:mock')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      render(<DecklistModal deck={deck} format="MO" onClose={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: /download decklist/i }))

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob).toBeInstanceOf(Blob)
      expect(clickSpy).toHaveBeenCalledTimes(1)

      clickSpy.mockRestore()
      vi.unstubAllGlobals()
    })

    it('surfaces an error message when the download fails', async () => {
      const createObjectURL = vi.fn(() => {
        throw new Error('no blob')
      })
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
      render(<DecklistModal deck={deck} format="MO" onClose={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /download decklist/i }))

      expect(await screen.findByText(/could not copy/i)).toBeInTheDocument()
      vi.unstubAllGlobals()
    })
  })
  describe('image view', () => {
    const mixedDeck = {
      main: [
        { quantity: 4, name: 'Island', typeLine: 'Basic Land — Island', imageUrl: 'i.jpg', thumbnailUrl: 'i-s.jpg' },
        { quantity: 4, name: 'Snapcaster Mage', typeLine: 'Creature — Human Wizard', imageUrl: 'c.jpg', thumbnailUrl: 'c-s.jpg' },
        { quantity: 2, name: 'Opt', typeLine: 'Instant', imageUrl: 'o.jpg', thumbnailUrl: 'o-s.jpg' },
      ],
      side: [{ quantity: 3, name: 'Negate', typeLine: 'Instant', imageUrl: 'n.jpg', thumbnailUrl: 'n-s.jpg' }],
      mainCount: 10,
      sideCount: 3,
      loading: false,
      error: null,
    }

    const toImages = () => fireEvent.click(screen.getByRole('button', { name: /card images/i }))

    it('opens in list view and switches to tiles on the toggle', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)

      expect(screen.queryAllByTestId('card-tile')).toHaveLength(0)
      toImages()
      // One tile per distinct card (3 main + 1 side), not one per copy.
      expect(screen.getAllByTestId('card-tile')).toHaveLength(4)
    })

    it('shows each card once with its copy count', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()

      expect(screen.getAllByText('x4')).toHaveLength(2)
      expect(screen.getByText('x2')).toBeInTheDocument()
      expect(screen.getByText('x3')).toBeInTheDocument()
    })

    it('uses the thumbnail image, not the full-size art', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()

      expect(screen.getByAltText('Snapcaster Mage')).toHaveAttribute('src', 'c-s.jpg')
    })

    it('renders the mainboard flat with lands last and no group headings', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()

      expect(screen.queryAllByTestId('card-group-heading')).toHaveLength(0)
      const names = screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
      // Creatures, then spells, then lands — the sideboard tile trails the main grid.
      expect(names.slice(0, 3)).toEqual(['Snapcaster Mage', 'Opt', 'Island'])
    })

    it('keeps the section card totals unchanged', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()

      expect(screen.getByText('10 cards')).toBeInTheDocument()
      expect(screen.getByText('3 cards')).toBeInTheDocument()
    })

    it('renders a placeholder tile for a card with no image', () => {
      useDeckCards.mockReturnValue({
        ...mixedDeck,
        main: [{ quantity: 1, name: 'Homebrew Nonsense', typeLine: null, imageUrl: null, thumbnailUrl: null }],
        mainCount: 1,
      })
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()

      expect(screen.getByTestId('card-tile-placeholder')).toHaveTextContent('Homebrew Nonsense')
      expect(screen.getByText('x1')).toBeInTheDocument()
      expect(screen.getByText('1 card')).toBeInTheDocument()
    })

    it('switches back to the list view', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()
      fireEvent.click(screen.getByRole('button', { name: /card list/i }))

      expect(screen.queryAllByTestId('card-tile')).toHaveLength(0)
      expect(screen.getAllByTestId('card-group-heading').length).toBeGreaterThan(0)
    })

    it('resets to list view when the modal is reopened', () => {
      useDeckCards.mockReturnValue(mixedDeck)
      const { unmount } = render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      toImages()
      expect(screen.getAllByTestId('card-tile').length).toBeGreaterThan(0)
      unmount()

      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      expect(screen.queryAllByTestId('card-tile')).toHaveLength(0)
    })

    it('exports the same decklist in either view', async () => {
      useDeckCards.mockReturnValue(mixedDeck)
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

      render(<DecklistModal deck={deck} format="ST" onClose={vi.fn()} />)
      fireEvent.click(screen.getByRole('button', { name: /export to mtg arena/i }))
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
      const fromList = writeText.mock.calls[0][0]

      toImages()
      fireEvent.click(screen.getByRole('button', { name: /export to mtg arena/i }))
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
      expect(writeText.mock.calls[1][0]).toBe(fromList)

      vi.unstubAllGlobals()
    })
  })
})
