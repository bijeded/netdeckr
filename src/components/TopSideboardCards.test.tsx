import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopSideboardCards } from './TopSideboardCards'
import type { TrendingCard } from '../lib/trendingCards'
import i18n from '../i18n'

const cards: TrendingCard[] = [
  { cardName: 'Flashfreeze', imageUrl: null, sharePct: 22.5, totalCopies: 270 },
  { cardName: 'Soul-Guide Lantern', imageUrl: null, sharePct: 15.6, totalCopies: 188 },
]

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('TopSideboardCards', () => {
  it('renders ranks, card names, and share with no change/previous columns', () => {
    render(<TopSideboardCards cards={cards} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Flashfreeze')).toBeInTheDocument()
    expect(screen.getByText('22.5%')).toBeInTheDocument()
    // no change chips, ever
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryByText('% Previous')).not.toBeInTheDocument()
  })

  it('renders the localized title', () => {
    render(<TopSideboardCards cards={cards} />)
    expect(screen.getByText('Top Sideboard Cards')).toBeInTheDocument()
  })

  it('renders a localized empty state when there are no sideboard cards', () => {
    render(<TopSideboardCards cards={[]} />)
    expect(screen.getByText('No sideboard cards yet')).toBeInTheDocument()
  })

  it('localizes the title in Spanish and keeps card names in English', async () => {
    await i18n.changeLanguage('es')
    render(<TopSideboardCards cards={cards} />)
    expect(screen.getByText('Top Cartas de Sideboard')).toBeInTheDocument()
    expect(screen.getByText('Flashfreeze')).toBeInTheDocument()
  })
})
