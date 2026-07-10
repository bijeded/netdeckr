import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TrendingTable } from './TrendingTable'
import type { TrendingCard } from '../lib/trendingCards'
import i18n from '../i18n'

const withDelta: TrendingCard[] = [
  { cardName: 'Cori-Steel Cutter', imageUrl: null, sharePct: 38.4, delta: { direction: 'up', prevPct: 31.2, valuePct: 7.2 } },
  { cardName: 'Monstrous Rage', imageUrl: null, sharePct: 26.1, delta: { direction: 'down', prevPct: 27.0, valuePct: -0.9 } },
]

const noDelta: TrendingCard[] = [
  { cardName: 'Steam Vents', imageUrl: null, sharePct: 40.0, delta: null },
  { cardName: 'Lightning Bolt', imageUrl: null, sharePct: 20.0, delta: null },
]

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('TrendingTable', () => {
  it('renders zero-padded ranks, card names, and current copy share', () => {
    render(<TrendingTable cards={withDelta} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
    expect(screen.getByText('38.4%')).toBeInTheDocument()
  })

  it('shows the previous share and a signed change chip when deltas are present', () => {
    render(<TrendingTable cards={withDelta} />)
    expect(screen.getByText('31.2%')).toBeInTheDocument() // % previous
    const chip = screen.getByRole('img', { name: 'Copy share up 7.2 points vs the previous period' })
    expect(chip.textContent).toContain('▲')
    expect(chip.textContent).toContain('+7.2')
  })

  it('hides the previous and change columns when every delta is suppressed', () => {
    render(<TrendingTable cards={noDelta} />)
    // no change chips at all
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    // the "% Previous" column header is not rendered
    expect(screen.queryByText('% Previous')).not.toBeInTheDocument()
    // current share still shows
    expect(screen.getByText('40.0%')).toBeInTheDocument()
  })

  it('renders a localized empty state when there are no cards', () => {
    render(<TrendingTable cards={[]} />)
    expect(screen.getByText('No trending cards yet')).toBeInTheDocument()
  })

  it('localizes the title and column headers in Spanish', async () => {
    await i18n.changeLanguage('es')
    render(<TrendingTable cards={withDelta} />)
    expect(screen.getByText('En Tendencia')).toBeInTheDocument()
    expect(screen.getByText('% Actual')).toBeInTheDocument()
    expect(screen.getByText('% Anterior')).toBeInTheDocument()
  })

  it('keeps card names in English in the Spanish locale', async () => {
    await i18n.changeLanguage('es')
    render(<TrendingTable cards={withDelta} />)
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
  })

  it('renders the title with a trophy-free header and a top-N subtitle', () => {
    const { container } = render(<TrendingTable cards={withDelta} />)
    expect(within(container).getByText('Trending')).toBeInTheDocument()
    expect(within(container).getByText(/Top 10/)).toBeInTheDocument()
  })
})
