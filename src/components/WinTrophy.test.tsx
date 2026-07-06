import { describe, it, expect, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import i18n from '../i18n'
import { WinTrophy } from './WinTrophy'

afterEach(() => i18n.changeLanguage('en'))

describe('WinTrophy', () => {
  it('renders nothing when there are no wins', () => {
    const { container } = render(<WinTrophy wins={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a negative count (defensive)', () => {
    const { container } = render(<WinTrophy wins={-1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a bare trophy with no multiplier for a single win', () => {
    render(<WinTrophy wins={1} />)
    const trophy = screen.getByRole('img', { name: '1 event win' })
    expect(trophy).toHaveTextContent('🏆')
    expect(trophy).not.toHaveTextContent('×')
  })

  it('shows a ×N multiplier for more than one win', () => {
    render(<WinTrophy wins={3} />)
    const trophy = screen.getByRole('img', { name: '3 event wins' })
    expect(trophy).toHaveTextContent('🏆')
    expect(trophy).toHaveTextContent('×3')
  })

  it('localizes the accessible label in Spanish', async () => {
    render(<WinTrophy wins={1} />)
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByRole('img', { name: '1 victoria' })).toBeInTheDocument()
  })

  it('localizes the plural accessible label in Spanish', async () => {
    render(<WinTrophy wins={3} />)
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByRole('img', { name: '3 victorias' })).toBeInTheDocument()
  })
})
