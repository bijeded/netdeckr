import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import i18n from '../i18n'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(() => i18n.changeLanguage('en'))

/** Component that throws on render, to trip the boundary. */
function Boom(): never {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  // React logs the caught error to console.error; silence it for clean output.
  let consoleError: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('renders a localized fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })

  it('localizes the fallback in Spanish', () => {
    act(() => {
      i18n.changeLanguage('es')
    })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })
})
