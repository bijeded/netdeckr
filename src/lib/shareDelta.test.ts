import { describe, it, expect } from 'vitest'
import { shareDeltas, DELTA_EPS, MIN_PREV_DECKS, type DeckForShareDelta } from './shareDelta'

// A fixed "now" so the day-offset slices are deterministic. 2026-07-20T12:00:00Z.
const NOW = new Date('2026-07-20T12:00:00Z')

/** ISO date `days` before NOW (YYYY-MM-DD). */
function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** A deck at a given whole-day age. */
function d(archetypeName: string, ageDays: number): DeckForShareDelta {
  return { archetypeName, eventDate: daysAgo(ageDays) }
}

describe('shareDeltas — window slicing', () => {
  it('for 5days, splits the last 5 days vs the prior 5 days (6–10)', () => {
    // Selected slice (0–5): A appears 1 of 2 decks → 50%.
    // Preceding slice (5–10): A appears 1 of 4 decks → 25%.  Delta = +25pp → up.
    const decks = [
      d('A', 1),
      d('B', 2),
      d('A', 7),
      d('B', 7),
      d('B', 8),
      d('B', 9),
    ]
    const result = shareDeltas(decks, '5days', NOW)
    expect(result).not.toBeNull()
    const a = result!.get('A')!
    expect(a.direction).toBe('up')
    expect(a.valuePct).toBeCloseTo(25, 5)
    const b = result!.get('B')!
    expect(b.direction).toBe('down')
    expect(b.valuePct).toBeCloseTo(-25, 5)
  })

  it('for 2weeks, splits the last 14 days vs the prior 14 days (14–28)', () => {
    // Selected (0–14): A 1 of 2 → 50%. Preceding (14–28): A 2 of 4 → 50%. Delta 0 → flat.
    const decks = [d('A', 3), d('B', 10), d('A', 20), d('A', 22), d('B', 24), d('B', 26)]
    const result = shareDeltas(decks, '2weeks', NOW)
    expect(result!.get('A')!.direction).toBe('flat')
    expect(result!.get('A')!.valuePct).toBeCloseTo(0, 5)
  })

  it('excludes decks outside both slices (older than 2N or null-dated)', () => {
    const decks: DeckForShareDelta[] = [
      d('A', 1),
      d('A', 2), // selected: A is 2/2 = 100%
      d('A', 7),
      d('B', 8),
      d('B', 9), // preceding: A is 1/3 ≈ 33.33%
      { archetypeName: 'A', eventDate: null }, // null date — ignored
      d('A', 40), // beyond the preceding slice — ignored (would make A 2/4=50% if counted)
    ]
    const a = shareDeltas(decks, '5days', NOW)!.get('A')!
    // Delta 100 − 33.33 proves the null-dated and 40-day decks were excluded.
    expect(a.valuePct).toBeCloseTo(66.67, 1)
  })
})

describe('shareDeltas — direction and deadband', () => {
  it('shows up with a positive pp delta when share rises beyond the deadband', () => {
    const decks = [d('A', 1), d('A', 1), d('B', 1), d('A', 7), d('B', 7), d('B', 7), d('B', 7)]
    // Selected (0–5): A 2/3 ≈ 66.7%. Preceding (5–10): A 1/4 = 25%. +41.7pp.
    const a = shareDeltas(decks, '5days', NOW)!.get('A')!
    expect(a.direction).toBe('up')
    expect(a.valuePct).toBeGreaterThan(0)
  })

  it('shows flat when the change is within the deadband', () => {
    // Construct a tiny sub-deadband change: selected 50%, preceding just under.
    // 5 selected decks (A x? ) — use shares that differ by < DELTA_EPS pp.
    // Selected: A 50/100 not possible with few decks; instead assert the constant guards it.
    expect(DELTA_EPS).toBeGreaterThan(0)
    // Equal shares (A 50% selected, A 50% preceding) → exactly flat.
    const decks = [d('A', 1), d('B', 1), d('A', 6), d('B', 7), d('A', 8), d('B', 9)]
    expect(shareDeltas(decks, '5days', NOW)!.get('A')!.direction).toBe('flat')
  })

  it('treats a delta exactly at ±DELTA_EPS as flat (deadband is inclusive)', () => {
    // Selected: A 50/100. Preceding: A 49.5/100 → delta exactly +0.5 pp = DELTA_EPS.
    const selected = [
      ...Array.from({ length: 50 }, () => d('A', 1)),
      ...Array.from({ length: 50 }, () => d('B', 1)),
    ]
    const preceding = [
      ...Array.from({ length: 99 }, () => d('A', 7)),
      ...Array.from({ length: 101 }, () => d('B', 7)),
    ]
    const a = shareDeltas([...selected, ...preceding], '5days', NOW)!.get('A')!
    expect(a.valuePct).toBeCloseTo(DELTA_EPS, 10)
    expect(a.direction).toBe('flat')
  })
})

describe('shareDeltas — new-this-period and absence', () => {
  it('treats an archetype absent in the preceding (populated) slice as a genuine rise', () => {
    // Preceding slice has enough decks (>= MIN_PREV_DECKS) but no A; A only appears now.
    const preceding = Array.from({ length: MIN_PREV_DECKS }, () => d('B', 7))
    const decks = [d('A', 1), d('B', 1), ...preceding]
    const a = shareDeltas(decks, '5days', NOW)!.get('A')!
    expect(a.direction).toBe('up')
    // Full current share of A: 1 of 2 selected = 50pp.
    expect(a.valuePct).toBeCloseTo(50, 5)
  })

  it('shows down for an archetype present only in the preceding slice', () => {
    const decks = [d('A', 1), d('B', 1), d('B', 7), d('B', 7), d('B', 7)]
    // C appears only in preceding? use B which is in both; test a gone archetype:
    const withGone = [...decks, d('Gone', 7)]
    const gone = shareDeltas(withGone, '5days', NOW)!.get('Gone')!
    expect(gone.direction).toBe('down')
    expect(gone.valuePct).toBeLessThan(0)
  })
})

describe('shareDeltas — suppression guard', () => {
  it('returns null when the preceding slice has fewer than MIN_PREV_DECKS decks', () => {
    const tooFew = Array.from({ length: MIN_PREV_DECKS - 1 }, () => d('A', 7))
    const decks = [d('A', 1), ...tooFew]
    expect(shareDeltas(decks, '5days', NOW)).toBeNull()
  })

  it('returns null when there is no preceding data at all (early corpus)', () => {
    const decks = [d('A', 1), d('B', 2)]
    expect(shareDeltas(decks, '5days', NOW)).toBeNull()
  })

  it('does not suppress when the preceding slice meets the guard', () => {
    const preceding = Array.from({ length: MIN_PREV_DECKS }, () => d('A', 7))
    const decks = [d('A', 1), ...preceding]
    expect(shareDeltas(decks, '5days', NOW)).not.toBeNull()
  })
})
