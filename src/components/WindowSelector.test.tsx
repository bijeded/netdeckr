import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import { WindowSelector } from './WindowSelector'

afterEach(() => i18n.changeLanguage('en'))

const LABELS = [
  'Last 2 weeks',
  'Last 5 days',
  'Last 2 months',
  'Large events (2 months)',
  'MTGO (2 months)',
]

describe('WindowSelector', () => {
  it('renders an option for each of the five windows with localized labels', () => {
    render(<WindowSelector value="50" onChange={() => {}} />)
    for (const name of LABELS) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('marks the active window as pressed', () => {
    render(<WindowSelector value="52" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Last 2 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Last 2 weeks' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onChange with the selected window code', () => {
    const onChange = vi.fn()
    render(<WindowSelector value="50" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'MTGO (2 months)' }))
    expect(onChange).toHaveBeenCalledWith('285')
  })

  it('shows a localized group heading', async () => {
    render(<WindowSelector value="50" onChange={() => {}} />)
    expect(screen.getByText('Window')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByText('Ventana')).toBeInTheDocument()
  })
})
