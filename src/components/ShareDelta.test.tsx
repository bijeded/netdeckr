import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShareDelta } from './ShareDelta'
import i18n from '../i18n'

describe('ShareDelta', () => {
  it('renders an up arrow with a signed positive value and a localized label', () => {
    render(<ShareDelta delta={{ direction: 'up', valuePct: 2.14 }} />)
    const el = screen.getByRole('img', { name: 'Metagame share up 2.1 points vs the previous period' })
    expect(el.textContent).toContain('▲')
    expect(el.textContent).toContain('+2.1')
  })

  it('renders a down arrow with a signed negative value', () => {
    render(<ShareDelta delta={{ direction: 'down', valuePct: -1.72 }} />)
    const el = screen.getByRole('img', { name: 'Metagame share down 1.7 points vs the previous period' })
    expect(el.textContent).toContain('▼')
    expect(el.textContent).toContain('-1.7')
  })

  it('renders a flat marker with no signed number', () => {
    render(<ShareDelta delta={{ direction: 'flat', valuePct: 0.2 }} />)
    const el = screen.getByRole('img', { name: 'Metagame share steady vs the previous period' })
    expect(el.textContent).toContain('–') // en-dash, not hyphen
    expect(el.textContent).not.toMatch(/[+]/)
  })

  it('renders nothing when the delta is suppressed (null)', () => {
    const { container } = render(<ShareDelta delta={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('localizes the accessible label in Spanish', async () => {
    await i18n.changeLanguage('es')
    try {
      render(<ShareDelta delta={{ direction: 'up', valuePct: 2.1 }} />)
      expect(
        screen.getByRole('img', {
          name: 'Cuota del metajuego +2.1 puntos respecto al periodo anterior',
        }),
      ).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
