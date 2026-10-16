import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { ExploreNav } from './ExploreNav'

describe('ExploreNav', () => {
  it('is a navigation landmark headed "Explore" with a Players row', () => {
    render(<ExploreNav active={false} onOpenPlayers={vi.fn()} />)
    expect(screen.getByRole('navigation', { name: 'Explore' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Players/ })).not.toHaveAttribute('aria-current')
  })

  it('opens the Players view', () => {
    const onOpenPlayers = vi.fn()
    render(<ExploreNav active={false} onOpenPlayers={onOpenPlayers} />)
    fireEvent.click(screen.getByTestId('explore-players'))
    expect(onOpenPlayers).toHaveBeenCalled()
  })

  it('marks the row as the current page while its view is open', () => {
    render(<ExploreNav active onOpenPlayers={vi.fn()} />)
    expect(screen.getByTestId('explore-players')).toHaveAttribute('aria-current', 'page')
  })
})
