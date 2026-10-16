import { describe, it, expect } from 'vitest'
import {
  groupPlayers,
  playerKey,
  rankTopGrinders,
  rankTopPlayers,
  type PlayerDeck,
} from './players'

let nextId = 1
function deck(over: Partial<PlayerDeck> = {}): PlayerDeck {
  const id = nextId++
  return {
    id,
    sourceDeckId: String(id),
    player: 'Player',
    placement: '5-8',
    eventName: 'Challenge',
    eventDate: '2026-10-10',
    archetypeName: 'Mono Red',
    colorIdentity: 'R',
    eventId: id,
    playerCount: 64,
    unranked: false,
    ...over,
  }
}

const group = (decks: PlayerDeck[], name: string) => groupPlayers(decks).find((g) => g.displayName === name)!

describe('playerKey', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(playerKey('  MoxlessGuy ')).toBe(playerKey('moxlessguy'))
  })

  it('keeps inner spaces and punctuation distinct', () => {
    expect(playerKey('Bruno Guerra')).not.toBe(playerKey('BrunoGuerra'))
    expect(playerKey('_gianlu_')).not.toBe(playerKey('Gianlu_'))
  })

  it('is null for an empty name', () => {
    expect(playerKey('')).toBeNull()
    expect(playerKey('   ')).toBeNull()
  })
})

describe('groupPlayers', () => {
  it('merges case variants into one player', () => {
    const groups = groupPlayers([deck({ player: 'MoxlessGuy' }), deck({ player: 'Moxlessguy' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].decks).toHaveLength(2)
  })

  it('shows the most common spelling', () => {
    const groups = groupPlayers([
      deck({ player: 'MoxlessGuy', eventDate: '2026-10-01' }),
      deck({ player: 'MoxlessGuy', eventDate: '2026-10-02' }),
      deck({ player: 'MoxlessGuy', eventDate: '2026-10-03' }),
      deck({ player: 'Moxlessguy', eventDate: '2026-10-09' }),
    ])
    expect(groups[0].displayName).toBe('MoxlessGuy')
  })

  it('breaks a spelling tie by the most recent deck', () => {
    const groups = groupPlayers([
      deck({ player: 'MoxlessGuy', eventDate: '2026-10-01' }),
      deck({ player: 'Moxlessguy', eventDate: '2026-10-09' }),
    ])
    expect(groups[0].displayName).toBe('Moxlessguy')
  })

  it('names the most-played archetype, with its color identity', () => {
    const g = groupPlayers([
      deck({ archetypeName: 'Kuldotha', colorIdentity: 'R', eventDate: '2026-10-09' }),
      deck({ archetypeName: 'Affinity', colorIdentity: 'U', eventDate: '2026-10-01' }),
      deck({ archetypeName: 'Affinity', colorIdentity: 'U', eventDate: '2026-10-02' }),
    ])[0]
    expect(g.topArchetype).toEqual({ name: 'Affinity', colorIdentity: 'U' })
  })

  it('breaks a most-played archetype tie by the most recent deck', () => {
    const g = groupPlayers([
      deck({ archetypeName: 'Affinity', eventDate: '2026-10-01' }),
      deck({ archetypeName: 'Kuldotha', eventDate: '2026-10-09' }),
    ])[0]
    expect(g.topArchetype.name).toBe('Kuldotha')
  })

  it('drops decks with an empty pilot name', () => {
    expect(groupPlayers([deck({ player: '' }), deck({ player: '  ' })])).toEqual([])
  })

  it('orders decks most recent first, best finish first within a date', () => {
    const g = groupPlayers([
      deck({ eventDate: '2026-10-01', placement: '1' }),
      deck({ eventDate: '2026-10-05', placement: '5-8' }),
      deck({ eventDate: '2026-10-05', placement: '2' }),
    ])[0]
    expect(g.decks.map((d) => [d.eventDate, d.placement])).toEqual([
      ['2026-10-05', '2'],
      ['2026-10-05', '5-8'],
      ['2026-10-01', '1'],
    ])
  })

  it('counts two decks in one event as one event', () => {
    const g = groupPlayers([deck({ eventId: 1 }), deck({ eventId: 1 }), deck({ eventId: 2 })])[0]
    expect(g.events).toBe(2)
    expect(g.decks).toHaveLength(3)
  })

  it('does not count a ladder position as a win', () => {
    const g = groupPlayers([deck({ placement: '1' }), deck({ placement: '1', unranked: true })])[0]
    expect(g.wins).toBe(1)
  })
})

describe('ranking eligibility', () => {
  it('excludes single-event players from both rankings, even an event winner', () => {
    const decks = [
      deck({ player: 'Winner', placement: '1', playerCount: 512 }),
      deck({ player: 'Regular' }),
      deck({ player: 'Regular' }),
    ]
    const groups = groupPlayers(decks)
    expect(rankTopPlayers(groups).map((g) => g.displayName)).toEqual(['Regular'])
    expect(rankTopGrinders(groups).map((g) => g.displayName)).toEqual(['Regular'])
  })

  it('makes a player with two decks in one event and one in another eligible', () => {
    const groups = groupPlayers([
      deck({ player: 'P', eventId: 1 }),
      deck({ player: 'P', eventId: 1 }),
      deck({ player: 'P', eventId: 2 }),
    ])
    expect(rankTopPlayers(groups)).toHaveLength(1)
  })

  it('caps each ranking at 10 rows', () => {
    const decks = Array.from({ length: 12 }, (_, i) => [deck({ player: `P${i}` }), deck({ player: `P${i}` })]).flat()
    const groups = groupPlayers(decks)
    expect(rankTopPlayers(groups)).toHaveLength(10)
    expect(rankTopGrinders(groups)).toHaveLength(10)
  })
})

describe('rankTopPlayers', () => {
  it('ranks deeper finishes higher at equal event counts and sizes', () => {
    const decks = [
      deck({ player: 'Deep', placement: '1' }),
      deck({ player: 'Deep', placement: '2' }),
      deck({ player: 'Shallow', placement: '5-8' }),
      deck({ player: 'Shallow', placement: '9-16' }),
    ]
    expect(rankTopPlayers(groupPlayers(decks)).map((g) => g.displayName)).toEqual(['Deep', 'Shallow'])
  })

  it('weighs identical results at larger events more', () => {
    const decks = [
      deck({ player: 'Small', placement: '1', playerCount: 16 }),
      deck({ player: 'Small', placement: '2', playerCount: 16 }),
      deck({ player: 'Large', placement: '1', playerCount: 256 }),
      deck({ player: 'Large', placement: '2', playerCount: 256 }),
    ]
    expect(rankTopPlayers(groupPlayers(decks)).map((g) => g.displayName)).toEqual(['Large', 'Small'])
  })

  it('scores unranked finishes flat rather than by position', () => {
    const ranked = [deck({ placement: '1' }), deck({ placement: '1' })]
    const ladder = ranked.map((d) => ({ ...d, unranked: true }))
    expect(group(ladder, 'Player').score).toBeLessThan(group(ranked, 'Player').score)
  })

  it('breaks score ties by events, then wins, then name', () => {
    // Identical finishes give identical scores, isolating the tie-break chain.
    const same = (player: string, eventId: number) => deck({ player, eventId, placement: '5-8' })
    const groups = groupPlayers([same('b', 1), same('b', 2), same('a', 3), same('a', 4)])
    expect(rankTopPlayers(groups).map((g) => g.displayName)).toEqual(['a', 'b'])
    const tied = groups.map((g) => ({ ...g, score: 50 }))
    tied[0].events = 3
    expect(rankTopPlayers(tied).map((g) => g.displayName)).toEqual(['b', 'a'])
    tied[0].events = 2
    tied[1].wins = 1
    expect(rankTopPlayers(tied).map((g) => g.displayName)).toEqual(['a', 'b'])
  })
})

describe('rankTopGrinders', () => {
  it('ranks more events higher regardless of finishes', () => {
    const decks = [
      ...Array.from({ length: 7 }, () => deck({ player: 'Grinder', placement: '17-32' })),
      ...Array.from({ length: 4 }, () => deck({ player: 'Winner', placement: '1' })),
    ]
    expect(rankTopGrinders(groupPlayers(decks)).map((g) => g.displayName)).toEqual(['Grinder', 'Winner'])
  })

  it('breaks event ties by wins, then by Top Players order', () => {
    const decks = [
      deck({ player: 'NoWin', placement: '2' }),
      deck({ player: 'NoWin', placement: '2' }),
      deck({ player: 'OneWin', placement: '1' }),
      deck({ player: 'OneWin', placement: '17-32' }),
      deck({ player: 'Deep', placement: '3-4' }),
      deck({ player: 'Deep', placement: '3-4' }),
    ]
    expect(rankTopGrinders(groupPlayers(decks)).map((g) => g.displayName)).toEqual(['OneWin', 'NoWin', 'Deep'])
  })
})
