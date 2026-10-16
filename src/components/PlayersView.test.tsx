import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { PlayersView } from './PlayersView'
import type { PlayerGroup } from '../lib/players'

afterEach(() => i18n.changeLanguage('en'))

function player(name: string, events: number, wins: number): PlayerGroup {
  return {
    key: name.toLowerCase(),
    displayName: name,
    topArchetype: { name: 'Boros Energy', colorIdentity: 'RW' },
    decks: [],
    events,
    wins,
    score: 0,
  }
}

const topPlayers = [player('rastaf', 7, 2), player('Slasher21', 2, 1), player('Noah Walters', 2, 0)]
const topGrinders = [player('Luminati', 10, 3), player('rastaf', 7, 2)]

function renderView(over: Partial<Parameters<typeof PlayersView>[0]> = {}) {
  const props = {
    ranking: 'top' as const,
    onRankingChange: vi.fn(),
    topPlayers,
    topGrinders,
    onSelectPlayer: vi.fn(),
    onBack: vi.fn(),
    ...over,
  }
  render(<PlayersView {...props} />)
  return props
}

const rows = () => within(screen.getByTestId('player-ranking')).getAllByRole('button')

describe('PlayersView', () => {
  it('shows the selected ranking with rank, name, events and wins', () => {
    renderView()
    expect(rows()).toHaveLength(3)
    expect(rows()[0]).toHaveTextContent('1')
    expect(rows()[0]).toHaveTextContent('rastaf')
    expect(rows()[0]).toHaveTextContent('7 events')
    expect(within(rows()[0]).getByRole('img', { name: '2 event wins' })).toBeInTheDocument()
  })

  it("shows each player's most-played archetype with its pips", () => {
    renderView()
    const archetype = within(rows()[0]).getByTestId('player-top-archetype')
    expect(archetype).toHaveTextContent('Boros Energy')
    expect(within(archetype).getAllByTestId('mana-pip')).toHaveLength(2)
  })

  it('omits the trophy for a player with no wins', () => {
    renderView()
    expect(within(rows()[2]).queryByRole('img')).toBeNull()
  })

  it('marks the active ranking and switches on toggle', () => {
    const props = renderView()
    expect(screen.getByRole('button', { name: 'Top Players' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Top Grinders' }))
    expect(props.onRankingChange).toHaveBeenCalledWith('grinders')
  })

  it('shows the grinders list when that ranking is selected', () => {
    renderView({ ranking: 'grinders' })
    expect(rows()[0]).toHaveTextContent('Luminati')
  })

  it('opens a Player view from a row', () => {
    const props = renderView()
    fireEvent.click(rows()[1])
    expect(props.onSelectPlayer).toHaveBeenCalledWith(topPlayers[1])
  })

  it('shows an empty state when nobody is eligible', () => {
    renderView({ topPlayers: [] })
    expect(screen.queryByTestId('player-ranking')).toBeNull()
    expect(screen.getByText('No player has 2 or more events in this view.')).toBeInTheDocument()
  })

  it('leaves to the metagame', () => {
    const props = renderView()
    fireEvent.click(screen.getByTestId('leave-players'))
    expect(props.onBack).toHaveBeenCalled()
  })

  it('is localized in Spanish, keeping player names as scraped', async () => {
    await act(() => i18n.changeLanguage('es'))
    renderView()
    expect(screen.getByRole('button', { name: 'Top Jugadores' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Top Grinders' })).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('7 eventos')
    expect(rows()[0]).toHaveTextContent('rastaf')
  })
})
