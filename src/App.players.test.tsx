import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import i18n from './i18n'
import App from './App'
import type { PlayerDeck } from './lib/players'

// Same hook seams as App.test.tsx: the dashboard is driven from mocked data.
const useFormatSelection = vi.fn()
const useMetagame = vi.fn()
const useLastUpdated = vi.fn()
const useDeckCards = vi.fn()
const useTrendingCards = vi.fn()

vi.mock('./hooks/useFormatSelection', () => ({ useFormatSelection: () => useFormatSelection() }))
vi.mock('./hooks/useMetagame', () => ({ useMetagame: (...args: unknown[]) => useMetagame(...args) }))
vi.mock('./hooks/useLastUpdated', () => ({ useLastUpdated: () => useLastUpdated() }))
vi.mock('./hooks/useDeckCards', () => ({ useDeckCards: (id: number | null) => useDeckCards(id) }))
vi.mock('./hooks/useTrendingCards', () => ({ useTrendingCards: (...args: unknown[]) => useTrendingCards(...args) }))

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}
const params = () => new URLSearchParams(window.location.search)

const ARCH = {
  boros: { archetypeName: 'Boros Energy', colorIdentity: 'RW' },
  izzet: { archetypeName: 'Izzet Prowess', colorIdentity: 'UR' },
}

let nextId = 1
function deck(player: string, eventId: number, placement: string, arch: keyof typeof ARCH): PlayerDeck {
  const id = nextId++
  return {
    id,
    sourceDeckId: String(id),
    player,
    placement,
    eventName: `Challenge ${eventId}`,
    eventDate: `2026-10-0${eventId}`,
    ...ARCH[arch],
    eventId,
    playerCount: 64,
    unranked: false,
  }
}

// rastaf: Boros at events 1 and 2, Izzet at 3. Slasher21: Izzet at 1 and 2.
// Solo: a single (winning) event, so never ranked.
const corpus: PlayerDeck[] = [
  deck('rastaf', 1, '1', 'boros'),
  deck('rastaf', 2, '5-8', 'boros'),
  deck('rastaf', 3, '1', 'izzet'),
  deck('Slasher21', 1, '2', 'izzet'),
  deck('Slasher21', 2, '3-4', 'izzet'),
  deck('Solo', 3, '1', 'boros'),
]

const breakdown = [
  { rank: 1, name: 'Boros Energy', colorIdentity: 'RW', sharePct: 50, tier: 'T1', trend: null, wins: 2 },
  { rank: 2, name: 'Izzet Prowess', colorIdentity: 'UR', sharePct: 50, tier: 'T2', trend: null, wins: 1 },
]

const events = [1, 2, 3].map((id) => ({
  id,
  name: `Challenge ${id}`,
  eventDate: `2026-10-0${id}`,
  playerCount: 64,
  deckCount: 2,
}))

function metagame(over: Record<string, unknown> = {}) {
  return {
    breakdown,
    decksByArchetype: {},
    fullDecksByArchetype: {
      'Boros Energy': corpus.filter((d) => d.archetypeName === 'Boros Energy'),
      'Izzet Prowess': corpus.filter((d) => d.archetypeName === 'Izzet Prowess'),
    },
    events,
    totals: { events: 3, archetypes: 2, decks: 6 },
    playerCorpus: corpus,
    loading: false,
    error: null,
    ...over,
  }
}

const rankedNames = () =>
  within(screen.getByTestId('player-ranking'))
    .getAllByRole('button')
    .map((row) => row.textContent)
const sidebar = () => screen.getByTestId('sidebar')
const lastMetagameFilters = () => useMetagame.mock.calls.at(-1)![2] as { eventId: number | null }

beforeEach(() => {
  vi.clearAllMocks()
  setUrl('/')
  useFormatSelection.mockReturnValue({ format: 'ST', setFormat: vi.fn() })
  useMetagame.mockReturnValue(metagame())
  useLastUpdated.mockReturnValue(null)
  useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: null })
  useTrendingCards.mockReturnValue({
    creatures: [],
    spells: [],
    sideboard: [],
    newCards: [],
    loading: false,
    error: null,
    newCardsError: null,
  })
})

afterEach(() => {
  i18n.changeLanguage('en')
  setUrl('/')
})

describe('App player views', () => {
  it('opens the Players view from the sidebar row, replacing the dashboard', () => {
    setUrl('?f=ST&w=2weeks')
    render(<App />)
    expect(screen.getByTestId('stat-strip')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('explore-players'))
    expect(screen.getByTestId('players-view')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-strip')).toBeNull()
    expect(screen.queryByTestId('archetype-grid')).toBeNull()
    expect(params().get('v')).toBe('players')
    expect(params().get('f')).toBe('ST')
    expect(params().get('w')).toBe('2weeks')
    expect(screen.getByTestId('explore-players')).toHaveAttribute('aria-current', 'page')
    // Solo has one event and is never ranked.
    expect(rankedNames()).toHaveLength(2)
    expect(rankedNames().join()).not.toContain('Solo')
  })

  it('ranks only the isolated archetype: top pilots of X', () => {
    setUrl('?a=Boros+Energy&v=players')
    render(<App />)
    expect(rankedNames()).toHaveLength(1)
    expect(rankedNames()[0]).toContain('rastaf')
    expect(rankedNames()[0]).toContain('2 events')
    expect(screen.getByTestId('grid-caption')).toHaveTextContent('Boros Energy')
  })

  it('applies the tier filter to the rankings', () => {
    setUrl('?v=players')
    render(<App />)
    fireEvent.change(within(sidebar()).getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T2' } })
    // Izzet only: rastaf has one Izzet event, Slasher21 has two.
    expect(rankedNames()).toHaveLength(1)
    expect(rankedNames()[0]).toContain('Slasher21')
  })

  it('disables and ignores the event filter in the view, keeping it for the dashboard', async () => {
    render(<App />)
    fireEvent.change(within(sidebar()).getByRole('combobox', { name: 'Event' }), { target: { value: '2' } })
    expect(lastMetagameFilters().eventId).toBe(2)

    fireEvent.click(screen.getByTestId('explore-players'))
    const select = within(sidebar()).getByRole('combobox', { name: 'Event' })
    expect(select).toBeDisabled()
    expect(select).toHaveValue('2')
    expect(lastMetagameFilters().eventId).toBeNull()

    fireEvent.click(screen.getByTestId('leave-players'))
    await waitFor(() => expect(screen.queryByTestId('players-view')).toBeNull())
    expect(within(sidebar()).getByRole('combobox', { name: 'Event' })).not.toBeDisabled()
    expect(lastMetagameFilters().eventId).toBe(2)
  })

  it('stays in the view when filters are cleared', () => {
    setUrl('?a=Boros+Energy&v=players')
    render(<App />)
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('players-view')).toBeInTheDocument()
    expect(rankedNames()).toHaveLength(2)
    expect(params().has('a')).toBe(false)
    expect(params().get('v')).toBe('players')
  })

  it('keeps the Players view on a format switch, dropping the player', () => {
    setUrl('?f=ST&v=players&p=rastaf')
    const { rerender } = render(<App />)
    expect(screen.getByTestId('player-view')).toBeInTheDocument()
    useFormatSelection.mockReturnValue({ format: 'MO', setFormat: vi.fn() })
    rerender(<App />)
    expect(screen.queryByTestId('player-view')).toBeNull()
    expect(screen.getByTestId('players-view')).toBeInTheDocument()
    expect(params().has('p')).toBe(false)
    expect(params().get('v')).toBe('players')
  })

  it('opens a shared Player link case-insensitively', () => {
    setUrl('?v=players&p=RASTAF')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'rastaf' })).toBeInTheDocument()
    expect(within(screen.getByTestId('player-decks')).getAllByRole('button')).toHaveLength(3)
  })

  it('shows the same event count in the ranking and the Player view', () => {
    setUrl('?v=players')
    render(<App />)
    const row = within(screen.getByTestId('player-ranking')).getByRole('button', { name: /rastaf/ })
    expect(row).toHaveTextContent('3 events')
    fireEvent.click(row)
    expect(screen.getByTestId('player-summary')).toHaveTextContent('3 events')
    expect(within(screen.getByTestId('player-decks')).getAllByRole('button')).toHaveLength(3)
  })

  it('walks Back from a Player view to the rankings, then to the dashboard', async () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('explore-players'))
    fireEvent.click(within(screen.getByTestId('player-ranking')).getByRole('button', { name: /rastaf/ }))
    expect(screen.getByTestId('player-view')).toBeInTheDocument()
    expect(params().get('p')).toBe('rastaf')

    act(() => window.history.back())
    await waitFor(() => expect(screen.getByTestId('players-view')).toBeInTheDocument())
    expect(params().has('p')).toBe(false)

    act(() => window.history.back())
    await waitFor(() => expect(screen.queryByTestId('players-view')).toBeNull())
    expect(screen.getByTestId('stat-strip')).toBeInTheDocument()
  })

  it('opens the Player view from the decklist modal player name', () => {
    setUrl('?a=Boros+Energy')
    render(<App />)
    fireEvent.click(within(screen.getByTestId('deck-list')).getAllByRole('button', { name: /rastaf/ })[0])
    fireEvent.click(screen.getByRole('button', { name: "View rastaf's decks" }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('player-view')).toBeInTheDocument()
    expect(params().get('p')).toBe('rastaf')
    // The isolated archetype still narrows the view, and the header says so.
    expect(screen.getByTestId('player-context')).toHaveTextContent('Boros Energy')
    expect(within(screen.getByTestId('player-decks')).getAllByRole('button')).toHaveLength(2)
  })

  it("keeps the name as text in the modal opened from the player's own view", () => {
    setUrl('?v=players&p=rastaf')
    render(<App />)
    fireEvent.click(within(screen.getByTestId('player-decks')).getAllByRole('button')[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('modal-player-link')).toBeNull()
  })

  it('closes the mobile drawer when the Players row is used', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Toggle filters' }))
      expect(sidebar()).toHaveAttribute('data-open', 'true')
      fireEvent.click(screen.getByTestId('explore-players'))
      expect(sidebar()).toHaveAttribute('data-open', 'false')
      expect(screen.getByTestId('players-view')).toBeInTheDocument()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})
