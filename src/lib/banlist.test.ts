import { describe, it, expect } from 'vitest'
import { recentlyBanned, NOTICE_WINDOW_DAYS, EMPTY_BANLIST, type BannedCard } from './banlist'

const NOW = new Date('2026-08-10T12:00:00Z')

function card(cardName: string, firstSeenAt: string | null): BannedCard {
  return { cardName, firstSeenAt }
}

describe('recentlyBanned', () => {
  it('keeps a ban first seen today', () => {
    const cards = [card('Fresh', '2026-08-10')]
    expect(recentlyBanned(cards, NOW)).toEqual(cards)
  })

  it('keeps a ban on the last day of the window', () => {
    const cards = [card('Edge', '2026-08-07')] // exactly 3 days before NOW
    expect(recentlyBanned(cards, NOW)).toEqual(cards)
  })

  it('drops a ban one day past the window', () => {
    expect(recentlyBanned([card('Stale', '2026-08-06')], NOW)).toEqual([])
  })

  it('never keeps a historical ban', () => {
    // Null is what seeding writes for a pre-existing ban; announcing those would
    // fire a notice for every ban in the format's history on first deploy.
    expect(recentlyBanned([card('Ancient', null)], NOW)).toEqual([])
  })

  it('keeps only the recent cards from a mixed list, in stored order', () => {
    const result = recentlyBanned(
      [
        card('Ancient', null),
        card('Recent A', '2026-08-09'),
        card('Stale', '2026-01-01'),
        card('Recent B', '2026-08-10'),
      ],
      NOW,
    )
    expect(result.map((c) => c.cardName)).toEqual(['Recent A', 'Recent B'])
  })

  it('returns nothing for an empty banlist', () => {
    expect(recentlyBanned([], NOW)).toEqual([])
  })

  it('honors an explicit window length', () => {
    const cards = [card('Older', '2026-08-01')]
    expect(recentlyBanned(cards, NOW, 3)).toEqual([])
    expect(recentlyBanned(cards, NOW, 30)).toEqual(cards)
  })

  it('defaults to the notice window', () => {
    const boundary = new Date(NOW.getTime() - NOTICE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    expect(recentlyBanned([card('Edge', boundary)], NOW)).toHaveLength(1)
  })
})

describe('EMPTY_BANLIST', () => {
  it('hides nothing and announces nothing', () => {
    expect(EMPTY_BANLIST.illegalDeckIds.size).toBe(0)
    expect(recentlyBanned(EMPTY_BANLIST.bannedCards, NOW)).toEqual([])
  })
})
