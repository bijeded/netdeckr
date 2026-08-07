import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import { FilterModal, type FilterModalRow } from './FilterModal'

afterEach(() => i18n.changeLanguage('en'))

const rows: FilterModalRow<string>[] = [
  { key: 'all', value: null, content: 'All tiers', meta: '730 decks' },
  { key: 'T1', value: 'T1', content: 'Tier 1', meta: '412 decks' },
  { key: 'T2', value: 'T2', content: 'Tier 2', meta: '180 decks' },
]

function renderModal(overrides: Partial<Parameters<typeof FilterModal<string>>[0]> = {}) {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(
    <FilterModal title="Tiers" rows={rows} value={null} onSelect={onSelect} onClose={onClose} {...overrides} />,
  )
  return { onSelect, onClose }
}

describe('FilterModal', () => {
  it('renders as a modal dialog named after its title', () => {
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Tiers' })).toHaveAttribute('aria-modal', 'true')
  })

  it('renders one row per option with its content and meta figure', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Tiers' })
    const labels = within(dialog)
      .getAllByRole('button')
      .filter((b) => b.classList.contains('filter-modal-row'))
      .map((b) => b.textContent)
    expect(labels).toEqual(['All tiers730 decks', 'Tier 1412 decks', 'Tier 2180 decks'])
  })

  it('marks the row matching the active value as selected', () => {
    renderModal({ value: 'T2' })
    expect(screen.getByRole('button', { name: /Tier 2/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Tier 1/ })).not.toHaveAttribute('aria-current')
  })

  it('marks the All row as selected when nothing is filtered', () => {
    renderModal({ value: null })
    expect(screen.getByRole('button', { name: /All tiers/ })).toHaveAttribute('aria-current', 'true')
  })

  it('reports the chosen value, and null for the All row', () => {
    const { onSelect } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Tier 1/ }))
    expect(onSelect).toHaveBeenCalledWith('T1')

    fireEvent.click(screen.getByRole('button', { name: /All tiers/ }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('closes on Escape without selecting anything', () => {
    const { onSelect, onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('closes on the close control and on an overlay click, without selecting', () => {
    const { onSelect, onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByTestId('filter-modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not close when the dialog itself is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('dialog', { name: 'Tiers' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus into the dialog on open and restores it to the trigger on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <FilterModal title="Tiers" rows={rows} value={null} onSelect={() => {}} onClose={() => {}} />,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('locks the page behind it so only the list scrolls', () => {
    const { unmount } = render(
      <FilterModal title="Tiers" rows={rows} value={null} onSelect={() => {}} onClose={() => {}} />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('localizes the close control', () => {
    i18n.changeLanguage('es')
    renderModal()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })
})
