import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '../i18n'
import { PlayerView } from './PlayerView'
import { groupPlayers, type PlayerDeck } from '../lib/players'

function deck(id: number, over: Partial<PlayerDeck> = {}): PlayerDeck {
  return {
    id,
    sourceDeckId: String(id),
    player: 'Luminati',
    placement: '5-8',
    eventName: `Challenge ${id}`,
    eventDate: `2026-10-0${id}`,
    archetypeName: 'Mono Red Rally',
    colorIdentity: 'R',
    eventId: id,
    playerCount: 64,
    unranked: false,
    ...over,
  }
}

const luminati = groupPlayers([deck(1, { placement: '1' }), deck(3), deck(2, { archetypeName: 'Kuldotha' })])[0]

function renderView(over: Partial<Parameters<typeof PlayerView>[0]> = {}) {
  const props = {
    player: luminati,
    requestedName: 'luminati',
    context: null,
    onSelectDeck: vi.fn(),
    onBack: vi.fn(),
    ...over,
  }
  render(<PlayerView {...props} />)
  return props
}

const deckRows = () => within(screen.getByTestId('player-decks')).getAllByRole('button')

describe('PlayerView', () => {
  it('lists every deck most recent first, led by archetype and pips', () => {
    renderView()
    expect(deckRows()).toHaveLength(3)
    expect(deckRows().map((b) => within(b).getByText(/Challenge/).textContent)).toEqual([
      'Challenge 3',
      'Challenge 2',
      'Challenge 1',
    ])
    expect(deckRows()[1]).toHaveTextContent('Kuldotha')
    expect(within(deckRows()[0]).getAllByTestId('mana-pip')).toHaveLength(1)
  })

  it('shows the display name, events and wins', () => {
    renderView()
    expect(screen.getByRole('heading', { name: 'Luminati' })).toBeInTheDocument()
    expect(screen.getByTestId('player-summary')).toHaveTextContent('3 events')
    expect(within(screen.getByTestId('player-summary')).getByRole('img', { name: '1 event win' })).toBeInTheDocument()
  })

  it('opens the decklist modal from a deck row', () => {
    const props = renderView()
    fireEvent.click(deckRows()[0])
    expect(props.onSelectDeck).toHaveBeenCalledWith(luminati.decks[0])
  })

  it('names the archetype narrowing in effect', () => {
    renderView({ context: 'Mono Red Rally' })
    expect(screen.getByTestId('player-context')).toHaveTextContent('Mono Red Rally')
  })

  it('shows an empty state naming the requested player when they have no decks', () => {
    const props = renderView({ player: null, requestedName: 'Ghost' })
    expect(screen.getByText('Ghost has no decks in this view.')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('leave-player'))
    expect(props.onBack).toHaveBeenCalled()
  })
})
