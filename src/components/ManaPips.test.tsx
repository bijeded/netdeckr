import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ManaPips } from './ManaPips'

describe('ManaPips', () => {
  it('renders one pip per color in the string', () => {
    render(<ManaPips colors="UR" />)
    const pips = screen.getAllByTestId('mana-pip')
    expect(pips.map((p) => p.dataset.color)).toEqual(['U', 'R'])
  })

  it('renders five pips for a five-color identity', () => {
    render(<ManaPips colors="WUBRG" />)
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(5)
  })

  it('caps at five pips even if given more colors', () => {
    render(<ManaPips colors="WUBRGW" />)
    expect(screen.getAllByTestId('mana-pip')).toHaveLength(5)
  })

  it('renders a single gray (colorless) pip for an empty identity', () => {
    render(<ManaPips colors="" />)
    const pips = screen.getAllByTestId('mana-pip')
    expect(pips).toHaveLength(1)
    expect(pips[0].dataset.color).toBe('C')
  })

  it('gives each pip a dark ring so it separates from the art behind it', () => {
    render(<ManaPips colors="W" />)
    // The pale W pip is the worst case over bright art.
    const shadow = screen.getAllByTestId('mana-pip')[0].style.boxShadow
    expect(shadow).toMatch(/rgba\(6, ?7, ?12/)
  })

  it('keeps the ring out of layout so pip size and spacing are unchanged', () => {
    render(<ManaPips colors="U" size={16} />)
    const pip = screen.getAllByTestId('mana-pip')[0]
    expect(pip.style.width).toBe('16px')
    expect(pip.style.height).toBe('16px')
  })
})
