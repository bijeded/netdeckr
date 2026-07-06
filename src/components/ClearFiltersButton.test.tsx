import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import { ClearFiltersButton } from './ClearFiltersButton'

afterEach(() => i18n.changeLanguage('en'))

describe('ClearFiltersButton', () => {
  it('renders a localized label', async () => {
    render(<ClearFiltersButton disabled={false} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    await act(() => i18n.changeLanguage('es'))
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
  })

  it('calls onClear when clicked', () => {
    const onClear = vi.fn()
    render(<ClearFiltersButton disabled={false} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('is disabled and does not fire when no filters are active', () => {
    const onClear = vi.fn()
    render(<ClearFiltersButton disabled={true} onClear={onClear} />)
    const button = screen.getByRole('button', { name: 'Clear filters' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClear).not.toHaveBeenCalled()
  })
})
