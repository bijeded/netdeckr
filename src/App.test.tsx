import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from './i18n'
import App from './App'

const useFormatSelection = vi.fn()
const useMetagameBreakdown = vi.fn()
const useLastUpdated = vi.fn()

vi.mock('./hooks/useFormatSelection', () => ({ useFormatSelection: () => useFormatSelection() }))
vi.mock('./hooks/useMetagameBreakdown', () => ({ useMetagameBreakdown: () => useMetagameBreakdown() }))
vi.mock('./hooks/useLastUpdated', () => ({ useLastUpdated: () => useLastUpdated() }))

const setFormat = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  useFormatSelection.mockReturnValue({ format: 'ST', setFormat })
  useMetagameBreakdown.mockReturnValue({ data: [], loading: false, error: null })
  useLastUpdated.mockReturnValue(null)
})

afterEach(() => i18n.changeLanguage('en'))

describe('App dashboard', () => {
  it('shows a spinner while loading', () => {
    useMetagameBreakdown.mockReturnValue({ data: [], loading: true, error: null })
    render(<App />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the format title and the archetype grid on success', () => {
    useMetagameBreakdown.mockReturnValue({
      data: [
        { rank: 1, name: 'Izzet Control', colorIdentity: 'UR', sharePct: 24 },
        { rank: 2, name: 'Selesnya Aggro', colorIdentity: 'WG', sharePct: 21 },
      ],
      loading: false,
      error: null,
    })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Standard' })).toBeInTheDocument()
    expect(screen.getByText('Izzet Control')).toBeInTheDocument()
    expect(screen.getByText('Selesnya Aggro')).toBeInTheDocument()
  })

  it('shows the freshness indicator when a timestamp exists', () => {
    useLastUpdated.mockReturnValue('2026-07-01T10:00:00Z')
    render(<App />)
    expect(screen.getByTestId('freshness').textContent).toMatch(/Updated/)
  })

  it('hides the freshness indicator when the timestamp is malformed', () => {
    useLastUpdated.mockReturnValue('not-a-date')
    render(<App />)
    expect(screen.queryByTestId('freshness')).toBeNull()
  })

  it('shows the empty state when there is no data', () => {
    useMetagameBreakdown.mockReturnValue({ data: [], loading: false, error: null })
    render(<App />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('shows the empty state on error', () => {
    useMetagameBreakdown.mockReturnValue({ data: [], loading: false, error: { message: 'boom' } })
    render(<App />)
    expect(screen.getByTestId('frowny')).toBeInTheDocument()
  })

  it('switches format when a pill is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Modern' }))
    expect(setFormat).toHaveBeenCalledWith('MO')
  })

  it('localizes UI copy in Spanish but keeps MTG format names in English', () => {
    i18n.changeLanguage('es')
    render(<App />)
    // Format name is an MTG proper noun — English in both locales.
    expect(screen.getByRole('heading', { name: 'Standard' })).toBeInTheDocument()
    // Surrounding UI copy is localized.
    expect(screen.getByText('Últimas 2 semanas')).toBeInTheDocument()
  })
})
