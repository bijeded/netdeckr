import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TrendingTable } from './TrendingTable'
import type { TrendingCard } from '../lib/trendingCards'
import i18n from '../i18n'

const cards: TrendingCard[] = [
  { cardName: 'Cori-Steel Cutter', imageUrl: null, sharePct: 3.4, totalCopies: 556 },
  { cardName: 'Monstrous Rage', imageUrl: null, sharePct: 2.6, totalCopies: 442 },
]

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('TrendingTable', () => {
  it('renders zero-padded ranks, card names, copy share, and copy count', () => {
    render(<TrendingTable cards={cards} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
    expect(screen.getByText('3.4%')).toBeInTheDocument()
    expect(screen.getByText('556')).toBeInTheDocument()
  })

  it('has no period-delta chip or previous-share column', () => {
    render(<TrendingTable cards={cards} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryByText('% Previous')).not.toBeInTheDocument()
  })

  it('renders a localized empty state when there are no cards', () => {
    render(<TrendingTable cards={[]} />)
    expect(screen.getByText('No trending cards yet')).toBeInTheDocument()
  })

  it('localizes the title and column headers in Spanish', async () => {
    await i18n.changeLanguage('es')
    render(<TrendingTable cards={cards} />)
    expect(screen.getByText('En Tendencia')).toBeInTheDocument()
    expect(screen.getByText('% Cuota')).toBeInTheDocument()
    expect(screen.getByText('Copias')).toBeInTheDocument()
  })

  it('keeps card names in English in the Spanish locale', async () => {
    await i18n.changeLanguage('es')
    render(<TrendingTable cards={cards} />)
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
  })

  it('renders the title and a top-N subtitle', () => {
    const { container } = render(<TrendingTable cards={cards} />)
    expect(within(container).getByText('Trending')).toBeInTheDocument()
    expect(within(container).getByText(/Top 10/)).toBeInTheDocument()
  })
})
