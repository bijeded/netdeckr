import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import i18n from './i18n'
import App from './App'

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
    totals: { events: 0, archetypes: 0, decks: 0 },
    loading: false,
    error: null,
  })
  useLastUpdated.mockReturnValue(null)
  useDeckCards.mockReturnValue({ main: [], side: [], mainCount: 0, sideCount: 0, loading: false, error: null })
  // Non-empty by default so the trending tables render (not their own frowny
  // empty-state), keeping the grid-empty assertions to a single frowny.
  useTrendingCards.mockReturnValue({
    creatures: [{ cardName: 'Creature Card', imageUrl: null, totalCopies: 100, avgCopies: 4 }],
    spells: [{ cardName: 'Spell Card', imageUrl: null, totalCopies: 80, avgCopies: 3 }],
    sideboard: [{ cardName: 'Sideboard Card', imageUrl: null, totalCopies: 40, avgCopies: 2 }],
    loading: false,
    error: null,
  })
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

  it('renders the header StatCard strip from the corpus totals', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 34, archetypes: 12, decks: 1284 },
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    // Thousands separator applied.
    expect(screen.getByText('1,284')).toBeInTheDocument()
    // Localized labels.
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Archetypes')).toBeInTheDocument()
    expect(screen.getByText('Decks')).toBeInTheDocument()
  })

  it('narrows the strip to the event totals under an event filter', () => {
    // Under an event filter the hook returns event-narrowed totals; the strip
    // renders them directly (no App-side override for events).
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 60, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      totals: { events: 1, archetypes: 5, decks: 42 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    const strip = screen.getByTestId('stat-strip')
    expect(within(strip).getByText('1')).toBeInTheDocument()
    expect(within(strip).getByText('5')).toBeInTheDocument()
    expect(within(strip).getByText('42')).toBeInTheDocument()
  })

  it('overrides the strip to the isolated archetype under an archetype filter', () => {
    const decks = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      sourceDeckId: `d${i}`,
      player: `P${i}`,
      placement: '1',
      eventName: i < 2 ? 'RCQ' : 'PTQ', // 2 distinct events among 3 decks
      eventDate: '2026-07-05',
      archetypeName: 'Izzet Control',
      colorIdentity: 'UR',
    }))
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
        { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 20, tier: 'T2', trend: null, wins: 0 },
      ],
      decksByArchetype: { 'Izzet Control': decks },
      fullDecksByArchetype: { 'Izzet Control': decks },
      events: [],
      totals: { events: 34, archetypes: 12, decks: 1284 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
        target: { value: 'Izzet Control' },
      })
    })
    // Strip reflects the isolated archetype: 1 archetype, its 3 decks, 2 events.
    const strip = screen.getByTestId('stat-strip')
    expect(within(strip).getByText('1')).toBeInTheDocument()
    expect(within(strip).getByText('3')).toBeInTheDocument()
    expect(within(strip).getByText('2')).toBeInTheDocument()
    // The window-level totals are no longer shown.
    expect(within(strip).queryByText('1,284')).toBeNull()
  })

  it('passes each archetype win count through to its card trophy', () => {
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 2 },
        { rank: 2, name: 'Selesnya Aggro', colorIdentity: 'WG', sharePct: 21, tier: 'T2', trend: null, wins: 0 },
      ],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      loading: false,
      error: null,
    })
    render(<App />)
    // The winning archetype shows a trophy; the winless one does not.
    expect(screen.getByRole('img', { name: '2 event wins' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /event win/ })).toHaveLength(1)
  })

  it('caps the default grid at 12 archetypes and captions the shown count', () => {
    const breakdown = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      name: `Arch ${String(i).padStart(2, '0')}`,
      colorIdentity: '',
      sharePct: 20 - i,
      tier: 'Otros',
      trend: null,
      wins: 0,
    }))
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 3, archetypes: 15, decks: 40 },
      loading: false,
      error: null,
    })
    render(<App />)
    const main = screen.getByRole('main')
    // Only the top 12 cards render; the 13th+ are omitted.
    expect(within(main).getByText('Arch 00')).toBeInTheDocument()
    expect(within(main).getByText('Arch 11')).toBeInTheDocument()
    expect(within(main).queryByText('Arch 12')).toBeNull()
    expect(within(main).queryByText('Arch 14')).toBeNull()
    // The caption reflects the shown count.
    expect(screen.getByTestId('grid-caption').textContent).toBe('Top 12 most popular archetypes')
  })

  it('captions the actual count when fewer than the cap exist', () => {
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
        { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 20, tier: 'T2', trend: null, wins: 0 },
        { rank: 3, name: 'Selesnya Aggro', colorIdentity: 'WG', sharePct: 18, tier: 'T2', trend: null, wins: 0 },
      ],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 3, archetypes: 3, decks: 40 },
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByTestId('grid-caption').textContent).toBe('Top 3 most popular archetypes')
  })

  it('names the isolated archetype in the caption', () => {
    const decks = [
      {
        id: 1,
        sourceDeckId: 'd1',
        player: 'P',
        placement: '1',
        eventName: 'RCQ',
        eventDate: '2026-07-05',
        archetypeName: 'Izzet Control',
        colorIdentity: 'UR',
      },
    ]
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: { 'Izzet Control': decks },
      fullDecksByArchetype: { 'Izzet Control': decks },
      events: [],
      totals: { events: 1, archetypes: 1, decks: 1 },
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByTestId('grid-caption')).toHaveTextContent('Top 1 most popular archetype')
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
        target: { value: 'Izzet Control' },
      })
    })
    // The isolated view names itself rather than going untitled.
    expect(screen.getByTestId('grid-caption')).toHaveTextContent('Izzet Control')
  })

  it('localizes the popularity caption in Spanish', () => {
    i18n.changeLanguage('es')
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 1, archetypes: 1, decks: 1 },
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByTestId('grid-caption').textContent).toBe('Top 1 arquetipo más popular')
  })

  it('names the selected event and uncaps the grid in the popularity view', () => {
    const breakdown = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      name: `Arch ${String(i).padStart(2, '0')}`,
      colorIdentity: '',
      sharePct: 20 - i,
      tier: 'Otros',
      trend: null,
      wins: 0,
    }))
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      totals: { events: 1, archetypes: 15, decks: 40 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    // Caption becomes the event name + abbreviated date.
    expect(screen.getByTestId('grid-caption').textContent).toBe('RCQ — Jul 5')
    // The grid is uncapped: archetypes beyond the top-12 slice now render.
    const main = screen.getByRole('main')
    expect(within(main).getByText('Arch 12')).toBeInTheDocument()
    expect(within(main).getByText('Arch 14')).toBeInTheDocument()
  })

  it('appends the tournament size to the event caption (and the tier+event caption) when known', () => {
    const breakdown = [
      { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 40, tier: 'T1', trend: null, wins: 0 },
      { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 30, tier: 'T2', trend: null, wins: 0 },
    ]
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: { 'Izzet Control': [], 'Mono Red': [] },
      fullDecksByArchetype: { 'Izzet Control': [], 'Mono Red': [] },
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05', playerCount: 128 }],
      totals: { events: 1, archetypes: 2, decks: 10 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    expect(screen.getByTestId('grid-caption').textContent).toBe('RCQ — Jul 5 (128 players)')
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    expect(screen.getByTestId('grid-caption').textContent).toBe('Tier 1 — RCQ — Jul 5 (128 players)')
  })

  it('combines the tier label and event name when both filters are active', () => {
    const breakdown = [
      { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 40, tier: 'T1', trend: null, wins: 0 },
      { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 30, tier: 'T2', trend: null, wins: 0 },
    ]
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: { 'Izzet Control': [], 'Mono Red': [] },
      fullDecksByArchetype: { 'Izzet Control': [], 'Mono Red': [] },
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05' }],
      totals: { events: 1, archetypes: 2, decks: 10 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } })
    })
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    expect(screen.getByTestId('grid-caption').textContent).toBe('Tier 1 — RCQ — Jul 5')
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

  it('defaults to the Last 7 Days window and shows it in the header pill', () => {
    render(<App />)
    expect(screen.getByTestId('window-pill').textContent).toBe('Last 7 days')
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

  it('lists every archetype in the dropdown, including those past the top-12 grid', () => {
    // 15 archetypes: the grid caps at 12 but the Archetype filter must offer all 15.
    const breakdown = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      name: `Arch ${String(i).padStart(2, '0')}`,
      colorIdentity: '',
      sharePct: 20 - i,
      tier: 'Otros',
      trend: null,
      wins: 0,
    }))
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 3, archetypes: 15, decks: 40 },
      loading: false,
      error: null,
    })
    render(<App />)
    const dropdown = screen.getByRole('combobox', { name: 'Archetype' })
    // "Arch 14" is beyond the grid's top-12 slice but still a selectable option.
    const options = within(dropdown).getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('Arch 12')
    expect(options).toContain('Arch 14')
    // All 15 archetypes plus the "All archetypes" default entry.
    expect(options).toHaveLength(16)
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
    expect(lastCall?.[2]).toEqual({ eventId: 10, sizeClass: null })
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
    // Only the selected archetype's card remains in the grid. Names also appear as
    // filter <option>s and on the StatCard's active-filter line, so scope to the grid.
    const grid = screen.getByTestId('archetype-grid')
    expect(within(grid).getByText('Izzet Control')).toBeInTheDocument()
    expect(within(grid).queryByText('Mono Red')).toBeNull()
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

  describe('event-size filter', () => {
    const SIZED = {
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null },
      ],
      decksByArchetype: { 'Izzet Control': [] },
      fullDecksByArchetype: { 'Izzet Control': [] },
      // RCQ is a 128-player event → the `large` band.
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05', playerCount: 128, deckCount: 1 }],
      totals: { events: 1, archetypes: 1, decks: 1 },
      loading: false,
      error: null,
    }
    const sizeSelect = () => screen.getByRole('combobox', { name: 'Event size' })
    const eventSelect = () => screen.getByRole('combobox', { name: 'Event' })
    /** The filters the hook was last called with. */
    const lastFilters = () => useMetagame.mock.calls.at(-1)?.[2]

    it('passes the selected size class to the metagame hook', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      expect(lastFilters()).toMatchObject({ sizeClass: null })

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'medium' } }))
      expect(lastFilters()).toMatchObject({ sizeClass: 'medium' })
    })

    it('clears a selected event that the newly chosen size class excludes', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(eventSelect(), { target: { value: '10' } }))
      expect(eventSelect()).toHaveValue('10')

      // RCQ is `large`; choosing `small` contradicts it, so the most recent
      // choice wins and the event drops in the same update.
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'small' } }))
      expect(eventSelect()).toHaveValue('')
      expect(lastFilters()).toMatchObject({ eventId: null, sizeClass: 'small' })
    })

    it('keeps a selected event that the newly chosen size class includes', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(eventSelect(), { target: { value: '10' } }))

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'large' } }))
      expect(eventSelect()).toHaveValue('10')
      expect(lastFilters()).toMatchObject({ eventId: 10, sizeClass: 'large' })
    })

    it('never renders a pass with an event selected outside the active size class', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(eventSelect(), { target: { value: '10' } }))
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'small' } }))

      // The handler clears the event as the size is applied, so no render ever
      // asks the hook for a combination that is guaranteed to be empty — the
      // auto-reset effect has nothing left to correct after the fact.
      const contradictory = useMetagame.mock.calls.filter(
        ([, , f]) => f?.eventId === 10 && f?.sizeClass === 'small',
      )
      expect(contradictory).toHaveLength(0)
    })

    it('uncaps the grid when a size class is active', () => {
      // 15 archetypes — more than the top-12 default cap.
      const many = Array.from({ length: 15 }, (_, i) => ({
        rank: i + 1,
        name: `Archetype ${i + 1}`,
        colorIdentity: 'R',
        sharePct: 20 - i,
        tier: 'T3',
        trend: null,
      }))
      useMetagame.mockReturnValue({ ...SIZED, breakdown: many })
      render(<App />)
      const grid = () => within(screen.getByTestId('archetype-grid'))
      expect(grid().queryByText('Archetype 15')).not.toBeInTheDocument()
      expect(grid().getByText('Archetype 12')).toBeInTheDocument()

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'large' } }))
      // A narrowed field is shown in full, as it already is for a single event.
      expect(grid().getByText('Archetype 15')).toBeInTheDocument()
    })

    it('captions the view with the short size label', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'medium' } }))

      // "Mid", not the control's "Medium (32–95 players)", and no count. Scoped
      // to the caption — the select's own option legitimately carries the range.
      const caption = screen.getByTestId('grid-caption')
      expect(caption).toHaveTextContent('Mid')
      expect(caption).not.toHaveTextContent(/most popular archetypes/)
      expect(caption).not.toHaveTextContent(/32–95|players/)
    })

    it('uses "Unknown" for the unsized class in the caption', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'unsized' } }))
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('folds the size label into the tier and event captions', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'large' } }))
      act(() => fireEvent.change(eventSelect(), { target: { value: '10' } }))
      // Size and event both describe which events are in view — both are named.
      expect(screen.getByText(/Large — RCQ/)).toBeInTheDocument()

      act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), {
        target: { value: 'T1' },
      }))
      expect(screen.getByText(/Tier 1 — Large — RCQ/)).toBeInTheDocument()
    })

    it('localizes the caption size label', async () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'massive' } }))
      expect(screen.getByText('Massive')).toBeInTheDocument()

      await act(() => i18n.changeLanguage('es'))
      expect(screen.getByText('Masivo')).toBeInTheDocument()
    })

    it('sends the size class’s event ids to the trending tables', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      // Unfiltered: no event-id restriction reaches trending.
      expect(useTrendingCards.mock.calls.at(-1)?.[2]).toMatchObject({ eventIds: null })

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'large' } }))
      // Trending aggregates server-side, so it gets the resolved ids, not the band.
      expect(useTrendingCards.mock.calls.at(-1)?.[2]).toMatchObject({ eventIds: [10] })
    })

    it('enables Clear filters when a size class is the only active filter', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      const clear = screen.getByRole('button', { name: 'Clear filters' })
      expect(clear).toBeDisabled()

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'massive' } }))
      expect(clear).toBeEnabled()

      act(() => fireEvent.click(clear))
      expect(sizeSelect()).toHaveValue('')
      expect(lastFilters()).toMatchObject({ sizeClass: null })
    })

    it('resets the size class from the main-window Reset control', () => {
      useMetagame.mockReturnValue(SIZED)
      render(<App />)
      const reset = screen.getByTestId('reset-filters')
      expect(reset).toBeDisabled()

      act(() => fireEvent.change(sizeSelect(), { target: { value: 'large' } }))
      expect(reset).toBeEnabled()

      act(() => fireEvent.click(reset))
      expect(sizeSelect()).toHaveValue('')
    })

    it('keeps a size class that matches no event rather than auto-resetting it', () => {
      useMetagame.mockReturnValue(SIZED)
      const { rerender } = render(<App />)
      act(() => fireEvent.change(sizeSelect(), { target: { value: 'massive' } }))

      // No event falls in the band, so the hook returns an empty corpus. Unlike
      // the event filter, the size selection stands and the view goes empty.
      useMetagame.mockReturnValue({
        ...SIZED,
        breakdown: [],
        events: [],
        totals: { events: 0, archetypes: 0, decks: 0 },
      })
      act(() => rerender(<App />))
      expect(sizeSelect()).toHaveValue('massive')
    })
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

  it('renders the Tier filter after the Archetype filter in the sidebar', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    const comboboxes = within(sidebar).getAllByRole('combobox').map((c) => c.getAttribute('aria-label'))
    // Order: Time Frame (WindowSelector uses buttons, not a combobox) → Event
    // size and Event, both inside the one Event group → Archetype → Tiers.
    expect(comboboxes).toEqual(['Event size', 'Event', 'Archetype', 'Tiers'])
  })

  it('filters the grid to a selected tier, uncapped, as collapsible cards and hides the caption', () => {
    const breakdown = Array.from({ length: 14 }, (_, i) => ({
      rank: i + 1,
      name: `Arch ${String(i).padStart(2, '0')}`,
      colorIdentity: '',
      sharePct: 20 - i,
      // 13 T1 archetypes (past the 12 grid cap) + 1 T3.
      tier: i < 13 ? 'T1' : 'T3',
      trend: null,
      wins: 0,
    }))
    useMetagame.mockReturnValue({
      breakdown,
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 3, archetypes: 14, decks: 40 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    const main = screen.getByRole('main')
    // All 13 T1 archetypes show (past the 12 cap); the lone T3 does not.
    expect(within(main).getByText('Arch 12')).toBeInTheDocument()
    expect(within(main).queryByText('Arch 13')).toBeNull()
    // Cards are collapsible (no auto-expanded deck list).
    expect(screen.queryByTestId('deck-list')).toBeNull()
    // The caption now names the tier (in the same spot as the popularity caption).
    expect(screen.getByTestId('grid-caption').textContent).toBe('Tier 1 — 13 archetypes')
  })

  it('narrows the StatCard strip to the selected tier', () => {
    const deck = (name: string, id: string, event: string) => ({
      id,
      sourceDeckId: `${name}-${id}`,
      player: id,
      placement: '1',
      eventName: event,
      eventDate: '2026-07-05',
      archetypeName: name,
      colorIdentity: '',
    })
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
        { rank: 2, name: 'Azorius Control', colorIdentity: 'WU', sharePct: 20, tier: 'T1', trend: null, wins: 0 },
        { rank: 3, name: 'Mono Red', colorIdentity: 'R', sharePct: 18, tier: 'T3', trend: null, wins: 0 },
      ],
      decksByArchetype: {},
      fullDecksByArchetype: {
        // 2 T1 archetypes, 5 decks total, across 3 distinct events (RCQ/PTQ/SCG).
        'Izzet Control': [deck('Izzet Control', 'a', 'RCQ'), deck('Izzet Control', 'b', 'RCQ'), deck('Izzet Control', 'c', 'PTQ')],
        'Azorius Control': [deck('Azorius Control', 'd', 'SCG'), deck('Azorius Control', 'e', 'SCG')],
        'Mono Red': [deck('Mono Red', 'f', 'RCQ')], // T3, excluded from a T1 tier view
      },
      events: [],
      totals: { events: 5, archetypes: 3, decks: 99 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    const strip = screen.getByTestId('stat-strip')
    // 2 T1 archetypes, their 5 decks, across 3 events — not the window totals (99 decks).
    expect(within(strip).getByText('2')).toBeInTheDocument()
    expect(within(strip).getByText('5')).toBeInTheDocument()
    expect(within(strip).getByText('3')).toBeInTheDocument()
    expect(within(strip).queryByText('99')).toBeNull()
  })

  it('captions the fringe tier with the Rogue/Otros label', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Homebrew', colorIdentity: '', sharePct: 4, tier: 'Otros', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 1, archetypes: 1, decks: 2 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'Otros' } })
    })
    expect(screen.getByTestId('grid-caption').textContent).toBe('Rogue — 1 archetype')
  })

  it('shows an empty state when the selected tier matches no archetypes', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 1, archetypes: 1, decks: 5 },
      loading: false,
      error: null,
    })
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T3' } })
    })
    // No T3 archetypes → empty state, not the whole-corpus "no data" message.
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('drops the tier filter when an archetype outside that tier is isolated', () => {
    const decks = [
      {
        id: 1,
        sourceDeckId: 'd1',
        player: 'P',
        placement: '1',
        eventName: 'RCQ',
        eventDate: '2026-07-05',
        archetypeName: 'Mono Red',
        colorIdentity: 'R',
      },
    ]
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
        { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 20, tier: 'T3', trend: null, wins: 0 },
      ],
      decksByArchetype: { 'Mono Red': decks },
      fullDecksByArchetype: { 'Mono Red': decks },
      events: [],
      totals: { events: 1, archetypes: 2, decks: 5 },
      loading: false,
      error: null,
    })
    render(<App />)
    // Select Tier 1, then isolate Mono Red (a T3 archetype).
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: 'Mono Red' } })
    })
    // The tier filter silently resets, and Mono Red is isolated + auto-expanded.
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
    const grid = screen.getByTestId('archetype-grid')
    expect(within(grid).getByText('Mono Red')).toBeInTheDocument()
    expect(within(grid).queryByText('Izzet Control')).toBeNull()
  })

  it('resets the tier filter via Clear filters', () => {
    useMetagame.mockReturnValue({
      breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [],
      totals: { events: 1, archetypes: 1, decks: 5 },
      loading: false,
      error: null,
    })
    render(<App />)
    const clear = screen.getByRole('button', { name: 'Clear filters' })
    expect(clear).toBeDisabled()
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } })
    })
    expect(clear).toBeEnabled()
    act(() => fireEvent.click(clear))
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
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
    expect(screen.getByTestId('window-pill').textContent).toBe('Últimos 7 días')
  })
})

describe('Footer & legal pages', () => {
  it('renders the footer with both legal links and the language toggle on the dashboard', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Privacy policy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
  })

  it('no longer renders the language toggle inside the sidebar', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    expect(within(sidebar).queryByRole('button', { name: 'EN' })).toBeNull()
  })

  it('navigates to the How It Works page and hides the sidebar', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar')).toBeNull()
  })

  it('navigates to the Privacy Policy page and hides the sidebar', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Privacy policy' })))
    expect(screen.getByRole('heading', { name: 'Privacy policy' })).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar')).toBeNull()
  })

  it('keeps the topbar and format switcher visible on a legal page', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.getByRole('button', { name: 'Modern' })).toBeInTheDocument()
    expect(screen.getByText('Netdeckr')).toBeInTheDocument()
  })

  it('returns to the dashboard when the logo is clicked from a legal page', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.queryByTestId('sidebar')).toBeNull()
    const banner = screen.getByRole('banner')
    act(() => fireEvent.click(within(banner).getByRole('button', { name: 'Go to dashboard' })))
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
  })

  it('returns to the dashboard when the legal-page breadcrumb is clicked', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.queryByTestId('sidebar')).toBeNull()
    const main = screen.getByRole('main')
    act(() => fireEvent.click(within(main).getByRole('button', { name: 'Go to dashboard' })))
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
  })

  it('preserves other URL params when navigating to and from a legal page', () => {
    render(<App />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Last 2 weeks' }))
    })
    expect(new URLSearchParams(window.location.search).get('w')).toBe('2weeks')
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('w')).toBe('2weeks')
    expect(params.get('page')).toBe('how-it-works')
  })

  it('returns to the dashboard when the URL page param is cleared via back/forward navigation', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.queryByTestId('sidebar')).toBeNull()
    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('re-renders the legal page content in the new locale when the language toggle is used', () => {
    render(<App />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' })))
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    act(() => fireEvent.click(screen.getByRole('button', { name: 'ES' })))
    expect(screen.getByRole('heading', { name: 'Cómo funciona' })).toBeInTheDocument()
  })
})

describe('StatCard filter modals', () => {
  const DECKS = [
    {
      id: 1,
      sourceDeckId: 'd1',
      player: 'P1',
      placement: '1',
      eventName: 'RCQ',
      eventDate: '2026-07-05',
      archetypeName: 'Izzet Control',
      colorIdentity: 'UR',
    },
    {
      id: 2,
      sourceDeckId: 'd2',
      player: 'P2',
      placement: '3-4',
      eventName: 'PTQ',
      eventDate: '2026-07-01',
      archetypeName: 'Mono Red',
      colorIdentity: 'R',
    },
  ]

  beforeEach(() => {
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
        { rank: 2, name: 'Mono Red', colorIdentity: 'R', sharePct: 20, tier: 'T3', trend: null, wins: 0 },
      ],
      decksByArchetype: { 'Izzet Control': [DECKS[0]], 'Mono Red': [DECKS[1]] },
      fullDecksByArchetype: { 'Izzet Control': [DECKS[0]], 'Mono Red': [DECKS[1]] },
      events: [
        { id: 10, name: 'RCQ', eventDate: '2026-07-05', playerCount: 128, deckCount: 1 },
        { id: 20, name: 'PTQ', eventDate: '2026-07-01', playerCount: null, deckCount: 1 },
      ],
      totals: { events: 2, archetypes: 2, decks: 2 },
      loading: false,
      error: null,
    })
  })

  const openCard = (name: RegExp) => {
    const card = screen.getByRole('button', { name })
    act(() => fireEvent.click(card))
    return screen.getByRole('dialog')
  }

  it('opens the event filter from the Events card, listing each event as date, name, size', () => {
    render(<App />)
    const dialog = openCard(/Events/)
    expect(dialog).toHaveAccessibleName('Event')
    expect(within(dialog).getByRole('button', { name: /All events/ })).toBeInTheDocument()
    const rcq = within(dialog).getByRole('button', { name: /RCQ/ })
    expect(rcq.querySelector('.filter-modal-row-lead')).toHaveTextContent('Jul 5')
    expect(rcq.querySelector('.filter-modal-row-content')).toHaveTextContent('RCQ')
    expect(rcq.querySelector('.filter-modal-row-meta')).toHaveTextContent('128 players')
  })

  it('carries no deck count on any event row', () => {
    render(<App />)
    const dialog = openCard(/Events/)
    // The Events card counts events; one row per event already is that
    // breakdown, so no row figures itself in decks. Scoped to the rows: the
    // dialog's own description sentence legitimately says "decks".
    const rows = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
    for (const row of rows) expect(row.textContent).not.toMatch(/deck/i)
  })

  it('names an unrecorded event fact rather than punctuating it', () => {
    useMetagame.mockReturnValue({
      ...useMetagame(),
      events: [
        { id: 10, name: 'RCQ', eventDate: '2026-07-05', playerCount: 128, deckCount: 1 },
        { id: 20, name: 'PTQ', eventDate: '', playerCount: null, deckCount: 1 },
      ],
    })
    render(<App />)
    const dialog = openCard(/Events/)
    const ptq = within(dialog).getByRole('button', { name: /PTQ/ })
    // Both cells keep their place in the column band rather than collapsing, and
    // carry the word so a screen reader says "Unknown", not "em dash".
    expect(ptq.querySelector('.filter-modal-row-lead')).toHaveTextContent('Unknown')
    expect(ptq.querySelector('.filter-modal-row-meta')).toHaveTextContent('Unknown')
    expect(ptq.querySelector('.filter-modal-row-content')).toHaveTextContent('PTQ')
  })

  it('localizes the unrecorded-fact word in Spanish', () => {
    i18n.changeLanguage('es')
    useMetagame.mockReturnValue({
      ...useMetagame(),
      events: [{ id: 20, name: 'PTQ', eventDate: '', playerCount: null, deckCount: 1 }],
    })
    render(<App />)
    const dialog = openCard(/Eventos/)
    const ptq = within(dialog).getByRole('button', { name: /PTQ/ })
    // The date column is sized for this word, the longer of the two locales.
    expect(ptq.querySelector('.filter-modal-row-lead')).toHaveTextContent('Desconocido')
  })

  it('spans the "All events" row across the columns instead of filling them', () => {
    render(<App />)
    const dialog = openCard(/Events/)
    const all = within(dialog).getByRole('button', { name: 'All events' })
    // "All events" is the default, not an event with unrecorded facts, so it
    // renders no cells at all rather than calling them unknown.
    expect(all.querySelector('.filter-modal-row-lead')).toBeNull()
    expect(all.querySelector('.filter-modal-row-meta')).toBeNull()
    expect(all).toHaveTextContent('All events')
  })

  it('reserves the date column on every event row so the dates line up', () => {
    render(<App />)
    const dialog = openCard(/Events/)
    const rows = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
      .slice(1)
    for (const row of rows) {
      expect(row.querySelector('.filter-modal-row-lead')).not.toBeNull()
      expect(row.querySelector('.filter-modal-row-meta')).not.toBeNull()
    }
  })

  it('opens the archetype filter from the Archetypes card, share-descending with tier', () => {
    render(<App />)
    const dialog = openCard(/Archetypes/)
    expect(dialog).toHaveAccessibleName('Archetype')
    const rows = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
      .map((b) => b.textContent)
    expect(rows).toEqual(['All archetypes', 'Izzet ControlT124.0%', 'Mono RedT320.0%'])
  })

  it('puts the tier badge in its own column so the rows line up', () => {
    render(<App />)
    const dialog = openCard(/Archetypes/)
    const rows = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
    // Every row reserves the middle column, including the "All" row that leaves
    // it empty — that is what keeps the badges aligned down the list.
    for (const row of rows) {
      expect(row.querySelector('.filter-modal-row-aside')).not.toBeNull()
    }
    expect(rows[1].querySelector('.filter-modal-row-aside')).toHaveTextContent('T1')
    expect(rows[1].querySelector('.filter-modal-row-content')).toHaveTextContent('Izzet Control')
  })

  it('opens the tier filter from the Decks card, figuring each tier in archetypes only', () => {
    render(<App />)
    const dialog = openCard(/Decks/)
    expect(dialog).toHaveAccessibleName('Tiers')
    expect(within(dialog).getByRole('button', { name: /Tier 1.*1 archetype/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Tier 3.*1 archetype/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Tier 2.*0 archetypes/ })).toBeInTheDocument()
    expect(within(dialog).queryByText(/deck/)).toBeNull()
  })

  it('gives the tier rows one figure column that accounts for the whole field', () => {
    render(<App />)
    const dialog = openCard(/Decks/)
    const figures = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
      .map((b) => Array.from(b.querySelectorAll('.filter-modal-row-meta')).map((c) => c.textContent))
    // The "All" row totals the tier rows below it — 2 archetypes (Izzet Control
    // T1, Mono Red T3).
    expect(figures).toEqual([['2 archetypes'], ['1 archetype'], ['0 archetypes'], ['1 archetype'], ['0 archetypes']])
  })

  it('leaves every modal with at most one figure per row', () => {
    render(<App />)
    for (const card of [/Events/, /Archetypes/, /Decks/]) {
      const dialog = openCard(card)
      const rows = Array.from(dialog.querySelectorAll('.filter-modal-row'))
      for (const row of rows) {
        expect(row.querySelectorAll('.filter-modal-row-meta').length).toBeLessThanOrEqual(1)
      }
      act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    }
  })

  it('applies the picked filter, closes the modal, and captions the view', () => {
    render(<App />)
    const dialog = openCard(/Decks/)
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: /Tier 1/ })))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('T1')
    // The caption names the active tier; the card stays a value and a label.
    expect(screen.getByTestId('grid-caption')).toHaveTextContent('Tier 1')
    expect(screen.getByRole('button', { name: /Decks/ })).not.toHaveTextContent('Tier 1')
    // …and the grid is narrowed to that tier.
    const grid = screen.getByTestId('archetype-grid')
    expect(within(grid).getByText('Izzet Control')).toBeInTheDocument()
    expect(within(grid).queryByText('Mono Red')).toBeNull()
  })

  it('clears just that filter from the All row', () => {
    render(<App />)
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } }))
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } }))

    const dialog = openCard(/Decks/)
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: /All tiers/ })))

    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
    // The other filter is untouched.
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('10')
  })

  it('marks the active row when the filter was set from the sidebar', () => {
    render(<App />)
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T3' } }))

    const dialog = openCard(/Decks/)
    expect(within(dialog).getByRole('button', { name: /Tier 3/ })).toHaveAttribute('aria-current', 'true')
    expect(within(dialog).getByRole('button', { name: /Tier 1/ })).not.toHaveAttribute('aria-current')
  })

  it('still lists every event while one is selected, so the choice can be changed', () => {
    render(<App />)
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } }))

    const dialog = openCard(/Events/)
    expect(within(dialog).getByRole('button', { name: /RCQ/ })).toHaveAttribute('aria-current', 'true')
    // The unselected event is still offered, described in full.
    const ptq = within(dialog).getByRole('button', { name: /PTQ/ })
    expect(ptq.querySelector('.filter-modal-row-lead')).toHaveTextContent('Jul 1')
  })

  it('closes without changing the filters when dismissed', () => {
    render(<App />)
    openCard(/Decks/)
    act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
  })

  it('resolves archetype/tier conflicts in favor of the most recent choice', () => {
    render(<App />)
    // Isolate a T3 archetype, then pick Tier 1 from the modal: the tier wins.
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: 'Mono Red' } })
    })
    const dialog = openCard(/Decks/)
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: /Tier 1/ })))

    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('T1')
    expect(screen.getByRole('combobox', { name: 'Archetype' })).toHaveValue('')

    // The other direction still holds: picking an archetype outside the tier
    // clears the tier.
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: 'Mono Red' } })
    })
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Archetype' })).toHaveValue('Mono Red')
  })

  it('keeps an archetype isolated when its own tier is picked', () => {
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: 'Mono Red' } })
    })
    const dialog = openCard(/Decks/)
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: /Tier 3/ })))

    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('T3')
    expect(screen.getByRole('combobox', { name: 'Archetype' })).toHaveValue('Mono Red')
  })

})

describe('Main-window Reset', () => {
  beforeEach(() => {
    useMetagame.mockReturnValue({
      breakdown: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 },
      ],
      decksByArchetype: {},
      fullDecksByArchetype: {},
      events: [{ id: 10, name: 'RCQ', eventDate: '2026-07-05', playerCount: 128, deckCount: 1 }],
      totals: { events: 1, archetypes: 1, decks: 1 },
      loading: false,
      error: null,
    })
  })

  it('is rendered but disabled when nothing is filtered', () => {
    render(<App />)
    expect(screen.getByTestId('reset-filters')).toBeDisabled()
  })

  it('clears every filter, matching the sidebar control', () => {
    render(<App />)
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Event' }), { target: { value: '10' } }))
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } }))

    const reset = screen.getByTestId('reset-filters')
    expect(reset).toBeEnabled()
    act(() => fireEvent.click(reset))

    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Tiers' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Archetype' })).toHaveValue('')
    expect(reset).toBeDisabled()
  })

  it('stays in place when the filter state changes, so the grid does not jump', () => {
    render(<App />)
    expect(screen.getByTestId('reset-filters')).toBeInTheDocument()
    act(() => fireEvent.change(screen.getByRole('combobox', { name: 'Tiers' }), { target: { value: 'T1' } }))
    expect(screen.getByTestId('reset-filters')).toBeInTheDocument()
  })

  it('is reachable while an archetype is isolated', () => {
    render(<App />)
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), { target: { value: 'Izzet Control' } })
    })
    expect(screen.getByTestId('grid-caption')).toHaveTextContent('Izzet Control')
    expect(screen.getByTestId('reset-filters')).toBeEnabled()
  })

  it('is localized', () => {
    i18n.changeLanguage('es')
    render(<App />)
    expect(screen.getByTestId('reset-filters')).toHaveTextContent('Restablecer')
  })
})
