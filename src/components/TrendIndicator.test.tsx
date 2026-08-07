import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendIndicator } from './TrendIndicator'
import i18n from '../i18n'

describe('TrendIndicator', () => {
  it('renders an up arrow with a localized label and no numeric delta', () => {
    render(<TrendIndicator trend="up" />)
    const el = screen.getByRole('img', { name: 'Performance trending up' })
    expect(el.textContent).toContain('▲')
    expect(el.textContent).not.toMatch(/\d/) // arrow-only — the raw Power Score is never shown
  })

  it('renders a down arrow with a localized label', () => {
    render(<TrendIndicator trend="down" />)
    expect(screen.getByRole('img', { name: 'Performance trending down' }).textContent).toContain('▼')
  })

  it('renders a flat marker with a localized label', () => {
    render(<TrendIndicator trend="flat" />)
    expect(screen.getByRole('img', { name: 'Performance steady' }).textContent).toContain('–')
  })

  it('carries a glow so it reads as self-lit over art', () => {
    render(<TrendIndicator trend="up" />)
    // Structure, not exact color — the glow value stays tunable.
    expect(screen.getByRole('img', { name: 'Performance trending up' }).style.boxShadow).not.toBe('')
  })

  it('shares the tier badge\'s chip treatment so the two read as equally prominent', () => {
    render(<TrendIndicator trend="up" />)
    const el = screen.getByRole('img', { name: 'Performance trending up' })
    expect(el.style.background).toMatch(/rgba\(9, ?10, ?16/)
    expect(el.style.backdropFilter).toContain('blur')
    // Matches the badge's T3 ramp step — a trend has no rank to encode.
    expect(parseFloat(el.style.fontSize)).toBe(12.5)
  })

  it('localizes the accessible label in Spanish', async () => {
    await i18n.changeLanguage('es')
    try {
      render(<TrendIndicator trend="up" />)
      expect(screen.getByRole('img', { name: 'Rendimiento en alza' })).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
