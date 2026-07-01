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
})
