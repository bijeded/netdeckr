import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'
import type { Tier } from '../lib/tiers'

// Highest tier first — the ramp assertions below depend on this order.
const TIERS: Tier[] = ['T1', 'T2', 'T3', 'Otros']
const labelFor = (tier: Tier) => (tier === 'Otros' ? 'Rogue' : tier)

describe('TierBadge', () => {
  it('renders the given tier', () => {
    render(<TierBadge tier="T1" />)
    expect(screen.getByText('T1')).toBeInTheDocument()
  })

  it('renders another explicit tier', () => {
    render(<TierBadge tier="T2" />)
    expect(screen.getByText('T2')).toBeInTheDocument()
  })

  it('localizes the fringe tier as "Rogue" in English', () => {
    render(<TierBadge tier="Otros" />)
    expect(screen.getByText('Rogue')).toBeInTheDocument()
    expect(screen.queryByText('Otros')).toBeNull()
  })

  it('carries a glow so it reads as self-lit over art', () => {
    render(<TierBadge tier="T1" />)
    // Structure, not exact color — the glow value stays tunable.
    expect(screen.getByText('T1').style.boxShadow).not.toBe('')
  })

  it('backs every tier with its own dark scrim rather than the art behind it', () => {
    // The contract is "a dark backdrop exists and does not vary by tier", not the
    // exact alpha — that stays tunable above the ~75% contrast floor.
    const backgrounds = TIERS.map((tier) => {
      const { unmount } = render(<TierBadge tier={tier} />)
      const bg = screen.getByText(labelFor(tier)).style.background
      unmount()
      return bg
    })
    for (const bg of backgrounds) {
      expect(bg).toMatch(/rgba\(9, ?10, ?16/)
    }
    expect(new Set(backgrounds).size).toBe(1)
  })

  it('blurs the art behind the badge so it still reads as glass', () => {
    render(<TierBadge tier="T1" />)
    expect(screen.getByText('T1').style.backdropFilter).toContain('blur')
  })

  it('gives each tier its own hue', () => {
    const colors = TIERS.map((tier) => {
      const { unmount } = render(<TierBadge tier={tier} />)
      const color = screen.getByText(labelFor(tier)).style.color
      unmount()
      return color
    })
    expect(new Set(colors).size).toBe(TIERS.length)
  })

  it('ramps weight monotonically down from T1 to the fringe tier', () => {
    const weights = TIERS.map((tier) => {
      const { unmount } = render(<TierBadge tier={tier} />)
      const weight = parseInt(screen.getByText(labelFor(tier)).style.fontWeight, 10)
      unmount()
      return weight
    })
    // Tier order has to be readable without hue — in greyscale, or to a viewer
    // who cannot separate violet from cyan.
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1])
    }
    expect(weights[weights.length - 1]).toBeLessThan(weights[0])
  })

  it('keeps every tier the same size, so the ramp never bloats the card corner', () => {
    const sizes = TIERS.map((tier) => {
      const { unmount } = render(<TierBadge tier={tier} />)
      const el = screen.getByText(labelFor(tier))
      const size = `${el.style.fontSize}/${el.style.padding}`
      unmount()
      return size
    })
    expect(new Set(sizes).size).toBe(1)
  })

  it('renders the fringe tier at the same legibility treatment as T1', () => {
    // The fringe tier reads as last because of where it sits on the ramp, never
    // because it is faint — it gets the same scrim and a full-strength text color.
    const { unmount } = render(<TierBadge tier="T1" />)
    const top = screen.getByText('T1').style.background
    unmount()

    render(<TierBadge tier="Otros" />)
    const fringe = screen.getByText('Rogue')
    expect(fringe.style.background).toBe(top)
    expect(fringe.style.color).toBe('var(--tier-rogue-on-dark)')
    expect(fringe.style.backdropFilter).toContain('blur')
  })
})
