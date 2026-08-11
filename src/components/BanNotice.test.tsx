import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import { BanNotice } from './BanNotice'
import { NOTICE_WINDOW_DAYS, type BannedCard } from '../lib/banlist'

afterEach(() => i18n.changeLanguage('en'))

/** ISO date `n` days before now, matching how first_seen_at is stored. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function card(over: Partial<BannedCard> = {}): BannedCard {
  return { cardName: 'Banned Card', firstSeenAt: daysAgo(0), ...over }
}

describe('BanNotice', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  // -- visibility window ---------------------------------------------------

  it('shows for a ban first seen today', () => {
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    expect(screen.getByTestId('ban-notice')).toBeInTheDocument()
  })

  it('shows on the last day of the window', () => {
    render(
      <BanNotice
        formatCode="ST"
        bannedCards={[card({ firstSeenAt: daysAgo(NOTICE_WINDOW_DAYS) })]}
        hiddenDecks={3}
      />,
    )
    expect(screen.getByTestId('ban-notice')).toBeInTheDocument()
  })

  it('does not show once the window has elapsed', () => {
    render(
      <BanNotice
        formatCode="ST"
        bannedCards={[card({ firstSeenAt: daysAgo(NOTICE_WINDOW_DAYS + 1) })]}
        hiddenDecks={3}
      />,
    )
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })

  it('never shows for a historical ban', () => {
    // A null first_seen_at is a pre-existing ban recorded at seeding time —
    // announcing those would fire a notice for a decade of bans on first deploy.
    render(<BanNotice formatCode="ST" bannedCards={[card({ firstSeenAt: null })]} hiddenDecks={3} />)
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })

  it('does not show when the format has no bans at all', () => {
    render(<BanNotice formatCode="PI" bannedCards={[]} hiddenDecks={0} />)
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })

  it('announces only the recent cards, not the historical ones alongside them', () => {
    render(
      <BanNotice
        formatCode="ST"
        bannedCards={[
          card({ cardName: 'Ancient Ban', firstSeenAt: null }),
          card({ cardName: 'Old Ban', firstSeenAt: daysAgo(30) }),
          card({ cardName: 'Fresh Ban', firstSeenAt: daysAgo(1) }),
        ]}
        hiddenDecks={2}
      />,
    )
    const notice = screen.getByTestId('ban-notice')
    expect(notice).toHaveTextContent('Fresh Ban')
    expect(notice).not.toHaveTextContent('Ancient Ban')
    expect(notice).not.toHaveTextContent('Old Ban')
  })

  // -- content -------------------------------------------------------------

  it('names the format and the banned cards', () => {
    render(
      <BanNotice
        formatCode="ST"
        bannedCards={[card({ cardName: 'Card One' }), card({ cardName: 'Card Two' })]}
        hiddenDecks={5}
      />,
    )
    const notice = screen.getByTestId('ban-notice')
    expect(notice).toHaveTextContent('Standard')
    expect(notice).toHaveTextContent('Card One')
    expect(notice).toHaveTextContent('Card Two')
  })

  it('reports the hidden-deck count and that the figures exclude them', () => {
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={47} />)
    const notice = screen.getByTestId('ban-notice')
    expect(notice).toHaveTextContent('47 decks are hidden from this view')
    expect(notice).toHaveTextContent('calculated without them')
  })

  it('uses the singular form for a single hidden deck', () => {
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={1} />)
    expect(screen.getByTestId('ban-notice')).toHaveTextContent('1 deck is hidden')
  })

  it('still renders when no deck in this view is affected', () => {
    // A ban can be recent while the current window/filter holds none of its decks.
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={0} />)
    const notice = screen.getByTestId('ban-notice')
    expect(notice).toBeInTheDocument()
    expect(notice).toHaveTextContent('No decks in this view are affected')
  })

  it('never reports a count of hidden archetypes', () => {
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={5} />)
    expect(screen.getByTestId('ban-notice')).not.toHaveTextContent(/archetype/i)
  })

  it('localizes its copy but leaves card names in English', async () => {
    await act(async () => {
      await i18n.changeLanguage('es')
    })
    render(<BanNotice formatCode="ST" bannedCards={[card({ cardName: 'Sunfall' })]} hiddenDecks={2} />)
    const notice = screen.getByTestId('ban-notice')
    expect(notice).toHaveTextContent('Ya no son legales')
    expect(notice).toHaveTextContent('Sunfall')
  })

  // -- dismissal -----------------------------------------------------------

  it('hides when dismissed', () => {
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })

  it('stays dismissed across a remount within the session', () => {
    const { unmount } = render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    unmount()

    // Remounting is what a format switch away and back does.
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })

  it('dismissal is per format', () => {
    const { unmount } = render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    unmount()

    render(<BanNotice formatCode="MO" bannedCards={[card()]} hiddenDecks={3} />)
    expect(screen.getByTestId('ban-notice')).toBeInTheDocument()
  })

  it('reappears in a new session', () => {
    const { unmount } = render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    unmount()

    // A new session starts with empty sessionStorage.
    window.sessionStorage.clear()
    render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    expect(screen.getByTestId('ban-notice')).toBeInTheDocument()
  })

  it('a later ban announces despite an earlier one being dismissed', () => {
    const { unmount } = render(
      <BanNotice formatCode="ST" bannedCards={[card({ firstSeenAt: daysAgo(2) })]} hiddenDecks={3} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    unmount()

    render(
      <BanNotice formatCode="ST" bannedCards={[card({ firstSeenAt: daysAgo(0) })]} hiddenDecks={3} />,
    )
    expect(screen.getByTestId('ban-notice')).toBeInTheDocument()
  })

  it('a dismissal never resurrects an expired notice', () => {
    const { unmount } = render(<BanNotice formatCode="ST" bannedCards={[card()]} hiddenDecks={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    unmount()
    window.sessionStorage.clear()

    render(
      <BanNotice
        formatCode="ST"
        bannedCards={[card({ firstSeenAt: daysAgo(NOTICE_WINDOW_DAYS + 1) })]}
        hiddenDecks={3}
      />,
    )
    expect(screen.queryByTestId('ban-notice')).not.toBeInTheDocument()
  })
})
