import { describe, it, expect } from 'vitest'
import { buildArenaDeck, arenaDelivery, arenaFilename, type ArenaCard } from './arenaExport'

const main: ArenaCard[] = [
  { quantity: 4, name: 'Lightning Bolt' },
  { quantity: 2, name: 'Opt' },
]
const side: ArenaCard[] = [{ quantity: 3, name: 'Negate' }]

describe('buildArenaDeck', () => {
  it('emits a Deck section and a Sideboard section in "<qty> <name>" lines', () => {
    expect(buildArenaDeck(main, side)).toBe(
      'Deck\n4 Lightning Bolt\n2 Opt\n\nSideboard\n3 Negate',
    )
  })

  it('omits the Sideboard section when there are no sideboard cards', () => {
    expect(buildArenaDeck(main, [])).toBe('Deck\n4 Lightning Bolt\n2 Opt')
  })

  it('appends the non-foil printing "(SET) NUM" when set and collector number are present', () => {
    const withPrinting: ArenaCard[] = [
      { quantity: 4, name: 'Lightning Bolt', setCode: 'MH2', collectorNumber: '401' },
    ]
    expect(buildArenaDeck(withPrinting, [])).toBe('Deck\n4 Lightning Bolt (MH2) 401')
  })

  it('omits the printing when only one of set/collector is present', () => {
    const partial: ArenaCard[] = [
      { quantity: 1, name: 'Opt', setCode: 'ELD', collectorNumber: null },
    ]
    expect(buildArenaDeck(partial, [])).toBe('Deck\n1 Opt')
  })

  it('returns just the Deck header when the mainboard is empty', () => {
    expect(buildArenaDeck([], [])).toBe('Deck')
  })
})

describe('arenaDelivery', () => {
  it('uses the clipboard for Arena-supported formats (Standard, Pioneer)', () => {
    expect(arenaDelivery('ST')).toBe('clipboard')
    expect(arenaDelivery('PI')).toBe('clipboard')
  })

  it('downloads a file for non-Arena formats (Modern, Pauper, Pre-Modern)', () => {
    expect(arenaDelivery('MO')).toBe('download')
    expect(arenaDelivery('PAU')).toBe('download')
    expect(arenaDelivery('PREM')).toBe('download')
  })
})

describe('arenaFilename', () => {
  it('slugifies the archetype name into a .txt filename', () => {
    expect(arenaFilename('Izzet Control')).toBe('izzet-control.txt')
    expect(arenaFilename('Mono-Red Aggro')).toBe('mono-red-aggro.txt')
  })

  it('falls back to a generic name when the archetype slug is empty', () => {
    expect(arenaFilename('')).toBe('decklist.txt')
    expect(arenaFilename('   ')).toBe('decklist.txt')
  })
})
