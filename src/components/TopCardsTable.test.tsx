import { describe, it, expect, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TopCardsTable } from './TopCardsTable'
import type { TrendingCard } from '../lib/trendingCards'
import i18n from '../i18n'

const cards: TrendingCard[] = [
  {
    cardName: 'Cori-Steel Cutter',
    imageUrl: null,
    totalCopies: 556,
    avgCopies: 4,
    deckCount: 139,
    playRatePct: 37.6,
    trend: { direction: 'up', valuePct: 6.24 },
  },
  {
    cardName: 'Monstrous Rage',
    imageUrl: null,
    totalCopies: 442,
    avgCopies: 2,
    deckCount: 221,
    playRatePct: 0.3,
    trend: null,
  },
]

afterEach(async () => {
  await i18n.changeLanguage('en')
})

/** The text of every cell in a row, in DOM (= grid column) order. */
function rowCells(row: HTMLElement): string[] {
  return Array.from(row.children).map((c) => c.textContent ?? '')
}

describe('TopCardsTable', () => {
  it('renders one layout: rank, card, avg, copies, decks, trend — in that order', () => {
    const { container } = render(<TopCardsTable title="Top Creatures" cards={cards} emptyMessage="none" />)
    const [header, first] = Array.from(container.querySelectorAll<HTMLElement>('.top-cards-row'))
    expect(rowCells(header)).toEqual(['#', 'Card', 'Avg', 'Copies', 'Decks', 'Trend'])
    expect(rowCells(first)).toEqual(['01', 'Cori-Steel Cutter', '4x', '556', '38%', '▲+6.2'])
  })

  it('shows a tiny play rate as <1% and leaves a suppressed trend cell blank', () => {
    const { container } = render(<TopCardsTable title="Top Spells" cards={cards} emptyMessage="none" />)
    const second = container.querySelectorAll<HTMLElement>('.top-cards-row')[2]
    expect(rowCells(second)).toEqual(['02', 'Monstrous Rage', '2x', '442', '<1%', ''])
    // The cell is still there, so the grid columns stay aligned.
    expect(second.children).toHaveLength(6)
  })

  it('shows – when the play rate is unknown', () => {
    render(
      <TopCardsTable title="Top Spells" cards={[{ ...cards[0], playRatePct: null, trend: null }]} emptyMessage="none" />,
    )
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('marks the Copies header and cells so a narrow table can hide them', () => {
    const { container } = render(<TopCardsTable title="Top Creatures" cards={cards} emptyMessage="none" />)
    const copies = Array.from(container.querySelectorAll('.top-cards-copies')).map((c) => c.textContent)
    expect(copies).toEqual(['Copies', '556', '442'])
    expect(container.querySelector('section')).toHaveClass('top-cards')
  })

  it('renders no set-code chip or Set column', () => {
    render(<TopCardsTable title="Top New Cards" cards={cards} emptyMessage="none" />)
    expect(screen.queryByText('Set')).not.toBeInTheDocument()
  })

  it('previews a row\'s art on hover of its name', () => {
    const withArt = [{ ...cards[0], imageUrl: 'https://cards.scryfall.io/normal/x.jpg' }]
    render(<TopCardsTable title="Top New Cards" cards={withArt} emptyMessage="none" />)
    fireEvent.pointerEnter(screen.getByText('Cori-Steel Cutter'), { pointerType: 'mouse', clientX: 20, clientY: 20 })
    expect(screen.getByRole('img', { name: 'Cori-Steel Cutter' })).toBeInTheDocument()
  })

  it('labels the trend as a play-rate change', () => {
    render(<TopCardsTable title="Top Creatures" cards={cards} emptyMessage="none" />)
    expect(
      screen.getByRole('img', { name: 'Play rate up 6.2 points vs the previous period' }),
    ).toBeInTheDocument()
  })

  it('renders the passed title', () => {
    const { container } = render(
      <TopCardsTable title="Top Sideboard Cards" cards={cards} emptyMessage="none" />,
    )
    expect(within(container).getByText('Top Sideboard Cards')).toBeInTheDocument()
  })

  it('renders the empty-state message when there are no cards', () => {
    render(<TopCardsTable title="Top Creatures" cards={[]} emptyMessage="No trending cards yet" />)
    expect(screen.getByText('No trending cards yet')).toBeInTheDocument()
  })

  it('localizes the column headers and the trend label in Spanish', async () => {
    await i18n.changeLanguage('es')
    const { container } = render(<TopCardsTable title="Top Criaturas" cards={cards} emptyMessage="none" />)
    const header = container.querySelector<HTMLElement>('.top-cards-row')!
    expect(rowCells(header)).toEqual(['#', 'Carta', 'Prom.', 'Copias', 'Mazos', 'Tend.'])
    expect(
      screen.getByRole('img', { name: 'Presencia en mazos +6.2 puntos respecto al periodo anterior' }),
    ).toBeInTheDocument()
  })

  it('keeps card names in English in the Spanish locale', async () => {
    await i18n.changeLanguage('es')
    render(<TopCardsTable title="Top Criaturas" cards={cards} emptyMessage="none" />)
    expect(screen.getByText('Cori-Steel Cutter')).toBeInTheDocument()
  })
})
