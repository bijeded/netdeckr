import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '../i18n'
import type { AnalysisDeck } from '../lib/archetypeAnalysis'
import type { CardStatRow } from '../lib/stockList'

const { cardStats } = vi.hoisted(() => ({
  cardStats: { rows: [] as unknown[], loading: false, error: null as unknown },
}))
vi.mock('../hooks/useArchetypeCardStats', () => ({ useArchetypeCardStats: () => cardStats }))

import { ArchetypeAnalysis } from './ArchetypeAnalysis'

const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function corpusOf(count: number): AnalysisDeck[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    archetypeId: 5,
    archetypeName: 'Dimir Aggro',
    colorIdentity: 'UB',
    artImageUrl: null,
    artCropUrl: null,
    placement: '1',
    eventId: 100 + (i % 2),
    eventDate: recent,
    playerCount: 64,
    unranked: false,
  }))
}

function row(name: string, quantity: number, typeLine: string, deckIds: number[], board: 'main' | 'side' = 'main'): CardStatRow {
  return {
    board,
    name,
    scrapedName: name,
    deckIds,
    quantities: deckIds.map(() => quantity),
    typeLine,
    cmc: 1,
    rarity: 'rare',
    setCode: 'DSK',
    collectorNumber: '1',
    imageUrl: null,
    thumbnailUrl: null,
  }
}

/** Every one of `n` decks runs 20 Islands, 40 Bombs, and a 15-card sideboard. */
function rowsFor(n: number): CardStatRow[] {
  const ids = Array.from({ length: n }, (_, i) => i + 1)
  return [
    row('Island', 20, 'Basic Land — Island', ids),
    row('Bomb', 40, 'Instant', ids),
    row('Answer', 15, 'Instant', ids, 'side'),
  ]
}

function renderAnalysis(props: Partial<Parameters<typeof ArchetypeAnalysis>[0]> = {}) {
  return render(
    <ArchetypeAnalysis format="ST" archetypeName="Dimir Aggro" corpus={corpusOf(6)} {...props} />,
  )
}

describe('ArchetypeAnalysis', () => {
  beforeEach(() => {
    cardStats.rows = rowsFor(6)
    cardStats.loading = false
    cardStats.error = null
  })
  afterEach(() => vi.unstubAllGlobals())

  it('states its fixed scope with the analysed deck and event counts', () => {
    renderAnalysis()
    expect(screen.getByText('Last 2 weeks · all events')).toBeInTheDocument()
    expect(screen.getByText(/6 decks · 2 events/)).toBeInTheDocument()
  })

  it('shows the stock list first, as a grouped decklist', () => {
    renderAnalysis()
    const stock = screen.getByTestId('stock-list')
    const analysis = screen.getByTestId('archetype-analysis')
    expect(analysis.querySelector('section')).toBe(stock)
    expect(within(stock).getByText('Stock list')).toBeInTheDocument()
    expect(within(stock).getByText('60 cards')).toBeInTheDocument()
    expect(within(stock).getAllByTestId('card-group-heading').map((h) => h.textContent)).toEqual(['Lands', 'Spells'])
    expect(within(stock).getByText('Answer')).toBeInTheDocument()
  })

  it('exports a Standard stock list as Arena text named after the archetype', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderAnalysis()
    fireEvent.click(screen.getByRole('button', { name: /export to mtg arena/i }))
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument()
    const text = writeText.mock.calls[0][0] as string
    expect(text).toMatch(/^About\nName Dimir Aggro/)
    expect(text).toContain('40 Bomb (DSK) 1')
    expect(text).toContain('Sideboard\n15 Answer (DSK) 1')
  })

  it('exports a Modern stock list as MTGO text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderAnalysis({ format: 'MO' })
    fireEvent.click(screen.getByRole('button', { name: /mtgo/i }))
    await screen.findByText(/copied to clipboard/i)
    expect(writeText.mock.calls[0][0]).toBe('40 Bomb\r\n20 Island\r\n\r\n15 Answer')
  })

  it('labels a sample of fewer than 5 decks and not one of 5', () => {
    cardStats.rows = rowsFor(4)
    const { unmount } = renderAnalysis({ corpus: corpusOf(4) })
    expect(screen.getAllByTestId('small-sample').length).toBeGreaterThan(0)
    unmount()

    cardStats.rows = rowsFor(5)
    renderAnalysis({ corpus: corpusOf(5) })
    expect(screen.queryByTestId('small-sample')).toBeNull()
  })

  it('shows a loading indicator while card data loads', () => {
    cardStats.loading = true
    cardStats.rows = []
    renderAnalysis()
    expect(within(screen.getByTestId('stock-list')).getByRole('status')).toBeInTheDocument()
  })

  it('shows a localized error when card data fails, keeping the rest of the tab', () => {
    cardStats.error = { message: 'timeout' }
    cardStats.rows = []
    renderAnalysis()
    // Only the stock list depends on card data; the message appears once, there.
    expect(screen.getAllByText('Could not load card data. Try reloading the page.')).toHaveLength(1)
    expect(within(screen.getByTestId('stock-list')).getByText('Could not load card data. Try reloading the page.')).toBeInTheDocument()
    expect(screen.getByText('Last 2 weeks · all events')).toBeInTheDocument()
    expect(screen.getByTestId('analysis-performance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export to mtg arena/i })).toBeDisabled()
  })

  it('shows an empty state when the archetype has no deck in the 2-week window', () => {
    renderAnalysis({ corpus: [] })
    expect(screen.getByText('No decks for this archetype in the last 2 weeks.')).toBeInTheDocument()
  })

  it('renders in Spanish with card names left in English', async () => {
    const i18n = (await import('../i18n')).default
    await i18n.changeLanguage('es')
    renderAnalysis()
    expect(screen.getByText('Últimas 2 semanas · todos los eventos')).toBeInTheDocument()
    expect(screen.getByText('Lista base')).toBeInTheDocument()
    expect(screen.getAllByText('Bomb').length).toBeGreaterThan(0)
    expect(screen.getByText('Rendimiento')).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })

  describe('sections', () => {
    it('shows six stat cards and a funnel of ranked finishes only', () => {
      const corpus = corpusOf(6).map((d, i) =>
        i === 5 ? { ...d, unranked: true, playerCount: null } : { ...d, placement: ['1', '2', '3-4', '5-8', '9-16'][i] },
      )
      renderAnalysis({ corpus })
      const stats = screen.getByTestId('analysis-stats')
      const labels = within(stats).getAllByText(/./, { selector: '.stat-card-label' }).map((l) => l.textContent)
      expect(labels).toEqual(['Share', 'Tier', 'Power Score', 'Top 8 rate', 'Wins', 'Decks'])
      expect(within(stats).getByText('100.0%')).toBeInTheDocument()
      // Tier reads as plain stat text, like the other cards — not a badge.
      expect(within(stats).queryByTestId(/tier-badge/)).toBeNull()
      expect(within(stats).getByText('80%')).toBeInTheDocument()
      // The unranked (league) deck is left out of the funnel, without a note.
      const funnel = within(screen.getByTestId('analysis-funnel')).getAllByRole('listitem')
      expect(funnel.map((li) => li.textContent)).toEqual(['1st1', '2nd1', 'Top 41', 'Top 81', 'Beyond Top 81'])
      expect(screen.queryByText(/league deck/)).toBeNull()
    })

    it('shows no consensus table or sideboard plan', () => {
      renderAnalysis()
      expect(screen.queryByTestId('consensus-table')).toBeNull()
      expect(screen.queryByTestId('sideboard-plan')).toBeNull()
    })

    it('lists the curve values and type split for the stock list', () => {
      renderAnalysis()
      const curve = screen.getByTestId('mana-curve')
      expect(within(curve).getByText('Mana value 1: 40')).toBeInTheDocument()
      const types = screen.getByTestId('type-split')
      expect(within(types).getByText('Lands').nextSibling).toHaveTextContent('20')
      expect(within(types).getByText('Instants').nextSibling).toHaveTextContent('40')
      // Empty types are left out of the legend.
      expect(within(types).queryByText('Creatures')).not.toBeInTheDocument()
    })

    it('shows wildcard cost for Standard and not for Modern', () => {
      const { unmount } = renderAnalysis()
      const wildcards = screen.getByTestId('wildcards')
      const rare = within(wildcards).getAllByRole('listitem').find((li) => li.getAttribute('data-rarity') === 'rare')!
      // Bomb (40, capped at 4) + Answer (15, capped at 4); basics are free.
      expect(rare).toHaveTextContent('8')
      unmount()
      renderAnalysis({ format: 'MO' })
      expect(screen.queryByTestId('wildcards')).toBeNull()
    })

    it('labels every composition section on a small sample', () => {
      cardStats.rows = rowsFor(4)
      renderAnalysis({ corpus: corpusOf(4) })
      for (const id of ['stock-list', 'mana-curve']) {
        expect(within(screen.getByTestId(id)).getByTestId('small-sample')).toBeInTheDocument()
      }
    })
  })
})
