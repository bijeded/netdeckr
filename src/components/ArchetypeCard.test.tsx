import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArchetypeCard } from './ArchetypeCard'

describe('ArchetypeCard', () => {
  it('renders a #-prefixed rank, name, one-decimal share, and pips', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Izzet Control')).toBeInTheDocument()
    expect(screen.getByText('24.0%')).toBeInTheDocument()
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(2)
  })

  it('renders the archetype art image when a URL is provided', () => {
    render(
      <ArchetypeCard
        rank={1}
        name="Izzet Control"
        colors="UR"
        sharePct={24}
        artImageUrl="https://cards.scryfall.io/normal/fable.jpg"
      />,
    )
    const img = screen.getByTestId('archetype-art')
    expect(img).toHaveAttribute('src', 'https://cards.scryfall.io/normal/fable.jpg')
    // Decorative art — empty alt so a screen reader doesn't double-announce the name.
    expect(img).toHaveAttribute('alt', '')
  })

  it('prefers the cropped art URL over the normal image', () => {
    render(
      <ArchetypeCard
        rank={1}
        name="Izzet Control"
        colors="UR"
        sharePct={24}
        artImageUrl="https://cards.scryfall.io/normal/fable.jpg"
        artCropUrl="https://cards.scryfall.io/art_crop/fable.jpg"
      />,
    )
    expect(screen.getByTestId('archetype-art')).toHaveAttribute(
      'src',
      'https://cards.scryfall.io/art_crop/fable.jpg',
    )
  })

  it('renders the normal image when only it is provided (no crop)', () => {
    render(
      <ArchetypeCard
        rank={1}
        name="Izzet Control"
        colors="UR"
        sharePct={24}
        artImageUrl="https://cards.scryfall.io/normal/fable.jpg"
      />,
    )
    expect(screen.getByTestId('archetype-art')).toHaveAttribute(
      'src',
      'https://cards.scryfall.io/normal/fable.jpg',
    )
  })

  it('renders no image (gradient placeholder) when there is no art URL', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.queryByTestId('archetype-art')).toBeNull()
  })

  it('falls back to the placeholder if the art image fails to load', () => {
    render(
      <ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} artImageUrl="https://x/broken.jpg" />,
    )
    fireEvent.error(screen.getByTestId('archetype-art'))
    expect(screen.queryByTestId('archetype-art')).toBeNull()
  })

  it('shows the tier badge derived from the share %', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.getByText('T1')).toBeInTheDocument()
  })

  it('formats a fractional share to one decimal', () => {
    render(<ArchetypeCard rank={2} name="Selesnya Aggro" colors="WG" sharePct={14.2} />)
    expect(screen.getByText('14.2%')).toBeInTheDocument()
  })

  it('shows a single gray pip for a colorless archetype', () => {
    render(<ArchetypeCard rank={12} name="Reanimator" colors="" sharePct={1.2} />)
    const pips = screen.getAllByTestId('mana-pip')
    expect(pips).toHaveLength(1)
    expect(pips[0].dataset.color).toBe('C')
    expect(screen.getByText('#12')).toBeInTheDocument()
  })

  it('calls onClick when the card is activated', () => {
    const onClick = vi.fn()
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} onClick={onClick} />)
    fireEvent.click(screen.getByText('Izzet Control'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is a native, keyboard-accessible button when clickable', () => {
    const onClick = vi.fn()
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} onClick={onClick} />)
    // A native <button> is focusable and Enter/Space-activatable without extra ARIA.
    const card = screen.getByRole('button', { name: /Izzet Control/ })
    expect(card.tagName).toBe('BUTTON')
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is not a button when not clickable', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders children only when expanded', () => {
    const { rerender } = render(
      <ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} onClick={vi.fn()}>
        <div>deck rows</div>
      </ArchetypeCard>,
    )
    expect(screen.queryByText('deck rows')).toBeNull()

    rerender(
      <ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} expanded onClick={vi.fn()}>
        <div>deck rows</div>
      </ArchetypeCard>,
    )
    expect(screen.getByText('deck rows')).toBeInTheDocument()
  })

  it('reflects the expanded state via aria-expanded on the clickable card', () => {
    render(
      <ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} expanded onClick={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Izzet Control/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
