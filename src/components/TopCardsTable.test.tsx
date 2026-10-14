import { describe, it, expect, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TopCardsTable } from './TopCardsTable'
import type { TrendingCard } from '../lib/trendingCards'
import i18n from '../i18n'

const cards: TrendingCard[] = [
  { cardName: 'Cori-Steel Cutter', imageUrl: null, totalCopies: 556, avgCopies: 4 },
  { cardName: 'Monstrous Rage', imageUrl: null, totalCopies: 442, avgCopies: 2 },
]

afterEach(async () => {
  await i18n.changeLanguage('en')
})

const newCards: TrendingCard[] = [
  { cardName: 'Fracture Card', imageUrl: 'https://cards.scryfall.io/normal/x.jpg', totalCopies: 31, avgCopies: 3, setCode: 'FRA' },
  { cardName: 'Hobbit Card', imageUrl: null, totalCopies: 12, avgCopies: 2, setCode: 'HOB' },
]

describe('TopCardsTable', () => {
  it('renders a set-code chip column with showSet, and no average', () => {
    render(<TopCardsTable title="Top New Cards" cards={newCards} showSet emptyMessage="none" />)
    expect(screen.getByText('Set')).toBeInTheDocument()
    expect(screen.getByText('FRA')).toBeInTheDocument()
    expect(screen.getByText('HOB')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.queryByText('Avg')).not.toBeInTheDocument()
    expect(screen.queryByText('3x')).not.toBeInTheDocument()
  })

  it('previews a Top New Cards row\'s art on hover of its name', () => {
    render(<TopCardsTable title="Top New Cards" cards={newCards} showSet emptyMessage="none" />)
    fireEvent.pointerEnter(screen.getByText('Fracture Card'), { pointerType: 'mouse', clientX: 20, clientY: 20 })
    expect(screen.getByRole('img', { name: 'Fracture Card' })).toBeInTheDocument()
  })

  it('renders no set column without showSet', () => {
    render(<TopCardsTable title="Top Spells" cards={newCards} showAvg emptyMessage="none" />)
    expect(screen.queryByText('Set')).not.toBeInTheDocument()
    expect(screen.queryByText('FRA')).not.toBeInTheDocument()
  })

  it('renders zero-padded ranks, card names, average, and copy count when showAvg', () => {
    render(<TopCardsTable title="Trending Creatures" cards={cards} showAvg emptyMessage="none" />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
    expect(screen.getByText('4x')).toBeInTheDocument()
    expect(screen.getByText('556')).toBeInTheDocument()
  })

  it('does not render a copy-share percentage', () => {
    render(<TopCardsTable title="Trending Creatures" cards={cards} showAvg emptyMessage="none" />)
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
  })

  it('omits the average column when showAvg is false', () => {
    render(<TopCardsTable title="Top Sideboard Cards" cards={cards} emptyMessage="none" />)
    // still shows a header row and copies, but no avg header
    expect(screen.getByText('Copies')).toBeInTheDocument()
    expect(screen.queryByText('Avg')).not.toBeInTheDocument()
    expect(screen.queryByText('4x')).not.toBeInTheDocument()
  })

  it('renders the passed title and a header row (for height parity)', () => {
    const { container } = render(
      <TopCardsTable title="Top Sideboard Cards" cards={cards} emptyMessage="none" />,
    )
    expect(within(container).getByText('Top Sideboard Cards')).toBeInTheDocument()
    expect(within(container).getByText('#')).toBeInTheDocument()
    expect(within(container).getByText('Card')).toBeInTheDocument()
  })

  it('has no delta/preview images', () => {
    render(<TopCardsTable title="Trending Spells" cards={cards} showAvg emptyMessage="none" />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('renders the empty-state message when there are no cards', () => {
    render(<TopCardsTable title="Trending Creatures" cards={[]} showAvg emptyMessage="No trending cards yet" />)
    expect(screen.getByText('No trending cards yet')).toBeInTheDocument()
  })

  it('localizes the column headers in Spanish', async () => {
    await i18n.changeLanguage('es')
    render(<TopCardsTable title="Criaturas en Tendencia" cards={cards} showAvg emptyMessage="none" />)
    expect(screen.getByText('Prom.')).toBeInTheDocument()
    expect(screen.getByText('Copias')).toBeInTheDocument()
    expect(screen.getByText('Carta')).toBeInTheDocument()
  })

  it('keeps card names in English in the Spanish locale', async () => {
    await i18n.changeLanguage('es')
    render(<TopCardsTable title="Criaturas en Tendencia" cards={cards} showAvg emptyMessage="none" />)
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
  })
})
