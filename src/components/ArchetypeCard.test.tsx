import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArchetypeCard } from './ArchetypeCard'

describe('ArchetypeCard', () => {
  it('renders a zero-padded rank, name, one-decimal share, and pips', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Izzet Control')).toBeInTheDocument()
    expect(screen.getByText('24.0%')).toBeInTheDocument()
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(2)
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
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('calls onClick when the card is activated', () => {
    const onClick = vi.fn()
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} onClick={onClick} />)
    fireEvent.click(screen.getByText('Izzet Control'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is a keyboard-accessible button when clickable', () => {
    const onClick = vi.fn()
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} onClick={onClick} />)
    const card = screen.getByRole('button', { name: /Izzet Control/ })
    expect(card).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is not a button when not clickable', () => {
    render(<ArchetypeCard rank={1} name="Izzet Control" colors="UR" sharePct={24} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
