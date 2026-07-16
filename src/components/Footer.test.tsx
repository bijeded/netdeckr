import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import { Footer } from './Footer'

afterEach(() => i18n.changeLanguage('en'))

describe('Footer', () => {
  it('renders the How it works and Privacy policy links', () => {
    render(<Footer onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Privacy policy' })).toBeInTheDocument()
  })

  it('calls onNavigate with the right page code when a link is activated', () => {
    const onNavigate = vi.fn()
    render(<Footer onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }))
    expect(onNavigate).toHaveBeenCalledWith('how-it-works')
    fireEvent.click(screen.getByRole('button', { name: 'Privacy policy' }))
    expect(onNavigate).toHaveBeenCalledWith('privacy')
  })

  it('renders the language toggle and switches locale', () => {
    render(<Footer onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'ES' }))
    expect(i18n.language).toBe('es')
  })

  it('renders the Wizards Fan Content Policy legend', () => {
    render(<Footer onNavigate={vi.fn()} />)
    expect(
      screen.getByText(/unofficial Fan Content permitted under the Fan Content Policy/),
    ).toBeInTheDocument()
  })

  it('localizes the links and legend in Spanish', async () => {
    await act(() => i18n.changeLanguage('es'))
    render(<Footer onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cómo funciona' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Política de privacidad' })).toBeInTheDocument()
    expect(screen.getByText(/contenido de fans no oficial/)).toBeInTheDocument()
  })
})
