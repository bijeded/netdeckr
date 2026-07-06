import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from './i18n'
import App from './App'

const useFormatSelection = vi.fn()
const useMetagame = vi.fn()
const useLastUpdated = vi.fn()
const useDeckCards = vi.fn()

vi.mock('./hooks/useFormatSelection', () => ({ useFormatSelection: () => useFormatSelection() }))
vi.mock('./hooks/useMetagame', () => ({ useMetagame: (...args: unknown[]) => useMetagame(...args) }))
vi.mock('./hooks/useLastUpdated', () => ({ useLastUpdated: () => useLastUpdated() }))
vi.mock('./hooks/useDeckCards', () => ({ useDeckCards: (id: number | null) => useDeckCards(id) }))

const setFormat = vi.fn()

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

beforeEach(() => {
  vi.clearAllMocks()
  setUrl('/')
  useFormatSelection.mockReturnValue({ format: 'ST', setFormat })
  useMetagame.mockReturnValue({
    breakdown: [],
    decksByArchetype: {},
    fullDecksByArchetype: {},
    events: [],
    loading: false,
    error: null,
  })
  useLastUpdated.mockReturnValue(null)
  useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: null })
})

afterEach(() => {
  i18n.changeLanguage('en')
  setUrl('/')
})

describe('App dashboard', () => {
  it('shows a spinner while loading', () => {
    useMetagame.mockReturnValue({ breakdown: [], decksByArchetype: {}, loading: true, error: null })
    render(<App />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the format title and the archetype grid on success', () => {
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null },
        { rank: 2, name: 'Selesnya Aggro', colorIdentity: 'WG', sharePct: 21, tier: 'T2', trend: null },
      ],
      decksByArchetype: {},
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Standard' })).toBeInTheDocument()
    // Scope to the grid (main) — archetype names also appear as filter <option>s.
    const main = screen.getByRole('main')
    expect(within(main).getByText('Izzet Control')).toBeInTheDocument()
    expect(within(main).getByText('Selesnya Aggro')).toBeInTheDocument()
  })

  it('shows the freshness indicator when a timestamp exists', () => {
    useLastUpdated.mockReturnValue('2026-07-01T10:00:00Z')
    render(<App />)
    expect(screen.getByTestId('freshness').textContent).toMatch(/Updated/)
  })

  it('hides the freshness indicator when the timestamp is malformed', () => {
    useLastUpdated.mockReturnValue('not-a-date')
    render(<App />)
    expect(screen.queryByTestId('freshness')).toBeNull()
  })

  it('shows the empty state when there is no data', () => {
    useMetagame.mockReturnValue({ breakdown: [], decksByArchetype: {}, loading: false, error: null })
    render(<App />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('shows the empty state on error', () => {
    useMetagame.mockReturnValue({ breakdown: [], decksByArchetype: {}, loading: false, error: { message: 'boom' } })
    render(<App />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('switches format when a pill is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Modern' }))
    expect(setFormat).toHaveBeenCalledWith('MO')
  })

  it('defaults to the Last 5 Days window and shows it in the header pill', () => {
    render(<App />)
    expect(screen.getByTestId('window-pill').textContent).toBe('Last 5 days')
  })

  it('renders the Time Frame filter inside the sidebar', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toBeInTheDocument()
    // The window selector (Time Frame group) lives in the sidebar.
    expect(within(sidebar).getByText('Time Frame')).toBeInTheDocument()
  })

  it('toggles the sidebar open/closed via the topbar toggle button', () => {
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Toggle filters' })
    const sidebar = screen.getByTestId('sidebar')
    // Desktop default: sidebar open.
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(sidebar).toHaveAttribute('data-open', 'true')

    act(() => fireEvent.click(toggle))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(sidebar).toHaveAttribute('data-open', 'false')
  })

  it('updates the header window pill when a window is selected', () => {
    render(<App />)
    // The selector option and the header pill are distinct elements.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Last 2 weeks' }))
    })
    expect(screen.getByTestId('window-pill').textContent).toBe('Last 2 weeks')
  })

  it('expands an archetype with decks to show its decklist rows, and collapses again', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: {
        'Izzet Control': [
          {
            id: 1,
            sourceDeckId: 'd1',
            player: 'Norbspro',
            placement: '1',
            eventName: 'RCQ',
            eventDate: '2026-06-20',
            archetypeName: 'Izzet Control',
            colorIdentity: 'UR',
          },
        ],
      },
      loading: false,
      error: null,
    })
    render(<App />)

    expect(screen.queryByTestId('deck-list')).toBeNull()
    act(() => fireEvent.click(screen.getByRole('button', { name: /Izzet Control/ })))
    expect(screen.getByTestId('deck-list')).toBeInTheDocument()
    expect(screen.getByText('Norbspro')).toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole('button', { name: /Izzet Control/ })))
    expect(screen.queryByTestId('deck-list')).toBeNull()
  })

  it('opens the decklist modal when a deck card is clicked', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: {
        'Izzet Control': [
          {
            id: 1,
            sourceDeckId: 'd1',
            player: 'Norbspro',
            placement: '1',
            eventName: 'RCQ',
            eventDate: '2026-06-20',
            archetypeName: 'Izzet Control',
            colorIdentity: 'UR',
          },
        ],
      },
      loading: false,
      error: null,
    })
    useDeckCards.mockReturnValue({
      main: [{ quantity: 4, name: 'Island' }],
      side: [],
      mainCount: 4,
      sideCount: 0,
      loading: false,
      error: null,
    })
    render(<App />)

    // Expand, then click the deck card to open the modal.
    act(() => fireEvent.click(screen.getByRole('button', { name: /Izzet Control/ })))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => fireEvent.click(screen.getByRole('button', { name: /Norbspro/ })))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Island')).toBeInTheDocument()
    expect(useDeckCards).toHaveBeenCalledWith(1)
  })

  it('does not make an archetype expandable when it has no decks (defensive guard)', () => {
    // Derived breakdowns always have decks; this pins the App's defensive guard for
    // the impossible-in-practice case where a card has a share but no display decks.
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Reanimator', colorIdentity: '', sharePct: 3, tier: 'Otros', trend: null }],
      decksByArchetype: {},
      loading: false,
      error: null,
    })
    render(<App />)
    // No decks → the card is not a button and cannot expand.
    expect(screen.queryByRole('button', { name: /Reanimator/ })).toBeNull()
  })

  it('renders the Event, Archetype, and Clear filters controls in the sidebar', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    expect(within(sidebar).getByRole('combobox', { name: 'Event' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('combobox', { name: 'Archetype' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('keeps the filter controls usable inside the mobile drawer', () => {
    // Simulate a narrow viewport so the sidebar renders as a drawer, restoring
    // the default (desktop) stub afterwards so later tests are unaffected.
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
      const sidebar = screen.getByTestId('sidebar')
      // The drawer variant is applied and still contains every filter control.
      expect(sidebar.className).toContain('sidebar--drawer')
      expect(within(sidebar).getByText('Time Frame')).toBeInTheDocument()
      expect(within(sidebar).getByRole('combobox', { name: 'Event' })).toBeInTheDocument()
      expect(within(sidebar).getByRole('combobox', { name: 'Archetype' })).toBeInTheDocument()
      expect(within(sidebar).getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('passes the selected event id to useMetagame', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    const lastCall = useMetagame.mock.calls.at(-1)
    expect(lastCall?.[2]).toEqual({ eventId: 10 })
  })

  it('collapses the grid to a single archetype and auto-expands all its decks', () => {
    const fullDecks = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      sourceDeckId: `d${i}`,
      player: `Player ${i}`,
      placement: '5-8',
      eventName: 'League',
      eventDate: `2026-07-0${(i % 9) + 1}`,
      archetypeName: 'Izzet Control',
      colorIdentity: 'UR',
    }))
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null },
        { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 21, tier: 'T2', trend: null },
      ],
      decksByArchetype: { 'Izzet Control': fullDecks.slice(0, 6), 'Mono Red': [] },
      fullDecksByArchetype: { 'Izzet Control': fullDecks },
      events: [],
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
        target: { value: 'Izzet Control' },
      })
    })
    // Only the selected archetype's card remains in the grid (names also appear
    // as filter <option>s, so scope to main).
    const main = screen.getByRole('main')
    expect(within(main).getByText('Izzet Control')).toBeInTheDocument()
    expect(within(main).queryByText('Mono Red')).toBeNull()
    // Auto-expanded, listing all 8 decks (cap lifted).
    expect(screen.getByTestId('deck-list')).toBeInTheDocument()
    expect(screen.getByText('Player 7')).toBeInTheDocument()
  })

  it('shows all decks (uncapped) when expanding a card while an event is selected', () => {
    const fullDecks = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      sourceDeckId: `d${i}`,
      player: `Player ${i}`,
      placement: '5-8',
      eventName: 'RCQ',
      eventDate: '2026-07-05',
      archetypeName: 'Izzet Control',
      colorIdentity: 'UR',
    }))
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 60, tier: 'T1', trend: null }],
      decksByArchetype: { 'Izzet Control': fullDecks.slice(0, 6) },
      fullDecksByArchetype: { 'Izzet Control': fullDecks },
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      loading: false,
      error: null,
    })
    render(<App />)
    // Select an event, then expand the card.
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: /Izzet Control/ })))
    // All 8 event decks show, not just the capped 6.
    expect(screen.getByText('Player 7')).toBeInTheDocument()
  })

  it('enables Clear filters only when a filter is active and resets on click', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: { 'Izzet Control': [] },
      fullDecksByArchetype: { 'Izzet Control': [] },
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      loading: false,
      error: null,
    })
    render(<App />)
    const clear = screen.getByRole('button', { name: 'Clear filters' })
    expect(clear).toBeDisabled()

    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    expect(clear).toBeEnabled()

    act(() => fireEvent.click(clear))
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('')
  })

  it('auto-resets the event filter when the selected event leaves the corpus', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: { 'Izzet Control': [] },
      fullDecksByArchetype: { 'Izzet Control': [] },
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      loading: false,
      error: null,
    })
    const { rerender } = render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('10')

    // The corpus no longer contains event 10 (e.g. after a window change).
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: { 'Izzet Control': [] },
      fullDecksByArchetype: { 'Izzet Control': [] },
      events: [{ id: 20, name: 'PTQ', eventDate: '2026-07-01' }],
      loading: false,
      error: null,
    })
    act(() => rerender(<App />))
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('')
  })

  it('shows an empty state when the archetype filter matches no decks', () => {
    // Select an archetype, then it vanishes from the breakdown (combined filters).
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: { 'Izzet Control': [] },
      fullDecksByArchetype: { 'Izzet Control': [] },
      events: [],
      loading: false,
      error: null,
    })
    const { rerender } = render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
        target: { value: 'Izzet Control' },
      })
    })
    // Breakdown still lists it but with no decks under the (now combined) filters.
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      loading: false,
      error: null,
    })
    act(() => rerender(<App />))
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('localizes UI copy in Spanish but keeps MTG format names in English', () => {
    i18n.changeLanguage('es')
    render(<App />)
    // Format name is an MTG proper noun — English in both locales.
    expect(screen.getByRole('heading', { name: 'Standard' })).toBeInTheDocument()
    // Surrounding UI copy is localized: the filter headings, controls, and pill.
    expect(screen.getByText('Periodo')).toBeInTheDocument()
    expect(screen.getByText('Evento')).toBeInTheDocument()
    expect(screen.getByText('Arquetipo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
    expect(screen.getByTestId('window-pill').textContent).toBe('Últimos 5 días')
  })
})
