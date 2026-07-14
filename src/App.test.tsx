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

  it('hides the popularity caption while an archetype is isolated', () => {
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
    expect(screen.getByTestId('grid-caption')).toBeInTheDocument()
    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Archetype' }), {
        target: { value: 'Izzet Control' },
      })
    })
    expect(screen.queryByTestId('grid-caption')).toBeNull()
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

  it('renders the Tier filter after the Archetype filter in the sidebar', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    const comboboxes = within(sidebar).getAllByRole('combobox').map((c) => c.getAttribute('aria-label'))
    // Order: Time Frame (WindowSelector uses buttons, not a combobox) → Event → Archetype → Tiers.
    expect(comboboxes).toEqual(['Event', 'Archetype', 'Tiers'])
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
    const main = screen.getByRole('main')
    expect(within(main).getByText('Mono Red')).toBeInTheDocument()
    expect(within(main).queryByText('Izzet Control')).toBeNull()
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
