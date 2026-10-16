import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import './i18n'

// The Analysis tab is a lazy chunk: its module factory below runs only when the
// chunk is imported, so counting factory runs tells whether the dashboard
// requested it.
const { loads } = vi.hoisted(() => ({ loads: { count: 0 } }))
vi.mock('./components/ArchetypeAnalysis', () => {
  loads.count += 1
  return { ArchetypeAnalysis: () => <div data-testid="archetype-analysis" /> }
})
vi.mock('./hooks/useFormatSelection', () => ({ useFormatSelection: () => ({ format: 'ST', setFormat: vi.fn() }) }))
vi.mock('./hooks/useLastUpdated', () => ({ useLastUpdated: () => null }))
vi.mock('./hooks/useTrendingCards', () => ({
  useTrendingCards: () => ({ creatures: [], spells: [], sideboard: [], newCards: [], loading: false, error: null, newCardsError: null }),
}))
vi.mock('./hooks/useMetagame', () => {
  const deck = {
    id: 1,
    sourceDeckId: 'd1',
    player: 'Player 1',
    placement: '1',
    eventName: 'RCQ',
    eventDate: '2026-07-05',
    archetypeName: 'Izzet Control',
    colorIdentity: 'UR',
  }
  const result = {
    breakdown: [{ rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24, tier: 'T1', trend: null, wins: 0 }],
    decksByArchetype: { 'Izzet Control': [deck] },
    fullDecksByArchetype: { 'Izzet Control': [deck] },
    events: [],
    totals: { events: 1, archetypes: 1, decks: 1 },
    corpus: [],
    loading: false,
    error: null,
  }
  return { useMetagame: () => result }
})

import App from './App'

describe('Analysis tab chunk', () => {
  beforeEach(() => window.history.replaceState({}, '', '?a=Izzet+Control'))
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('is not requested until the Analysis tab is selected', async () => {
    render(<App />)
    expect(screen.getByTestId('archetype-tab-lists')).toHaveAttribute('aria-selected', 'true')
    expect(loads.count).toBe(0)

    act(() => fireEvent.click(screen.getByTestId('archetype-tab-analysis')))
    expect(await screen.findByTestId('archetype-analysis')).toBeInTheDocument()
    expect(loads.count).toBe(1)
  })
})
