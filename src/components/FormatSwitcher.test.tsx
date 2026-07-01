import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormatSwitcher } from './FormatSwitcher'

describe('FormatSwitcher', () => {
  it('renders a pill for each of the five formats with localized names', () => {
    render(<FormatSwitcher value="ST" onChange={() => {}} />)
    for (const name of ['Standard', 'Pioneer', 'Modern', 'Pauper', 'Pre-Modern']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('marks the active format as pressed', () => {
    render(<FormatSwitcher value="MO" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Modern' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the selected format code', () => {
    const onChange = vi.fn()
    render(<FormatSwitcher value="ST" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pauper' }))
    expect(onChange).toHaveBeenCalledWith('PAU')
  })
})
