import { describe, it, expect } from 'vitest'
import {
  buildStockList,
  deckWeight,
  medianRounded,
  modeHigh,
  type CardStatRow,
  type WeightedDeckInput,
} from './stockList'
import { UNRANKED_QUALITY } from './powerScore'

type Line = [name: string, quantity: number, typeLine: string, board?: 'main' | 'side']

/** Fold per-deck lists into RPC-shaped rows (one per board + card). */
function rowsFrom(lists: Record<number, Line[]>): CardStatRow[] {
  const rows = new Map<string, CardStatRow>()
  for (const [deckId, lines] of Object.entries(lists)) {
    for (const [name, quantity, typeLine, board = 'main'] of lines) {
      const key = `${board}|${name}`
      let row = rows.get(key)
      if (!row) {
        row = {
          board,
          name,
          scrapedName: name,
          deckIds: [],
          quantities: [],
          typeLine,
          cmc: null,
          rarity: null,
          setCode: null,
          collectorNumber: null,
          imageUrl: null,
          thumbnailUrl: null,
        }
        rows.set(key, row)
      }
      row.deckIds.push(Number(deckId))
      row.quantities.push(quantity)
    }
  }
  return [...rows.values()]
}

const deck = (id: number, placement = '1', playerCount: number | null = 64): WeightedDeckInput => ({
  id,
  placement,
  playerCount,
  unranked: false,
})

const BASIC = 'Basic Land — Island'
const CREATURE = 'Creature — Faerie'
const INSTANT = 'Instant'

/** A 60-card list: `lands` basic Islands plus filler 4-ofs named by prefix. */
function sixty(lands: number, prefix: string, extra: Line[] = []): Line[] {
  const lines: Line[] = [['Island', lands, BASIC]]
  let left = 60 - lands - extra.reduce((s, l) => s + l[1], 0)
  let i = 0
  while (left > 0) {
    const q = Math.min(4, left)
    lines.push([`${prefix} ${i++}`, q, INSTANT])
    left -= q
  }
  return [...lines, ...extra]
}

const names = (cards: { name: string }[]) => cards.map((c) => c.name)

describe('helpers', () => {
  it('rounds an even-length median half up', () => {
    expect(medianRounded([60, 61])).toBe(61)
    expect(medianRounded([23, 24, 25])).toBe(24)
    expect(medianRounded([])).toBe(0)
  })

  it('takes the most common count, ties to the higher', () => {
    expect(modeHigh([4, 4, 1, 1])).toBe(4)
    expect(modeHigh([2, 2, 3])).toBe(2)
  })

  it('weights unranked and unparseable finishes without dropping them', () => {
    expect(deckWeight({ id: 1, placement: '1', playerCount: 64, unranked: true })).toBeCloseTo(UNRANKED_QUALITY)
    expect(deckWeight({ id: 1, placement: '', playerCount: 64, unranked: false })).toBeCloseTo(0.1)
  })
})

describe('buildStockList', () => {
  it('ranks a deep finish at a large event above a shallow finish at a small one', () => {
    const rows = rowsFrom({
      1: [['Card A', 1, INSTANT]],
      2: [['Card B', 1, INSTANT]],
    })
    // The median mainboard is one card, so only the higher-ranked card is placed.
    const result = buildStockList(rows, [deck(1, '1', 256), deck(2, '17-32', 20)])
    expect(names(result.main)).toEqual(['Card A'])
  })

  it('treats each basic land type as its own card', () => {
    const rows = rowsFrom({
      1: [['Island', 12, BASIC], ['Swamp', 12, 'Basic Land — Swamp'], ['Spell', 36, INSTANT]],
    })
    const { main } = buildStockList(rows, [deck(1)])
    expect(main.find((c) => c.name === 'Island')?.quantity).toBe(12)
    expect(main.find((c) => c.name === 'Swamp')?.quantity).toBe(12)
  })

  it('places a card at its most common count, not the rounded average', () => {
    const lists: Record<number, Line[]> = {}
    const counts = [4, 4, 1, 1]
    counts.forEach((q, i) => {
      lists[i + 1] = sixty(24, `d${i}`, [['Flex', q, INSTANT]])
    })
    const result = buildStockList(rowsFrom(lists), counts.map((_, i) => deck(i + 1)))
    expect(result.main.find((c) => c.name === 'Flex')?.quantity).toBe(4)
  })

  it('keeps the median mainboard size and land count', () => {
    const lists = {
      1: sixty(24, 'a'),
      2: sixty(24, 'b'),
      3: sixty(23, 'c'),
    }
    const { main } = buildStockList(rowsFrom(lists), [deck(1), deck(2), deck(3)])
    const total = main.reduce((s, c) => s + c.quantity, 0)
    const lands = main.filter((c) => c.typeLine?.includes('Land')).reduce((s, c) => s + c.quantity, 0)
    expect(total).toBe(60)
    expect(lands).toBe(24)
  })

  it('trims the next-ranked card to the slots left', () => {
    // 24 lands + 8 core 4-ofs + a 2-of = 58 cards, leaving 2 non-land slots.
    const core: Line[] = Array.from({ length: 8 }, (_, i) => [`Core ${i}`, 4, CREATURE] as Line)
    const base: Line[] = [['Island', 24, BASIC], ...core, ['Two', 2, INSTANT]]
    const rows = rowsFrom({
      1: [...base, ['Big', 4, INSTANT]],
      2: [...base, ['Big', 4, INSTANT]],
      3: [...base, ['Fill', 2, INSTANT]],
      4: [...base, ['Fill', 2, INSTANT]],
      5: [...base, ['Fill', 2, INSTANT]],
    })
    // Big's two wins at a large event outweigh Fill's three shallow finishes at small ones.
    const decks = [deck(1, '1', 256), deck(2, '1', 256), deck(3, '40', 20), deck(4, '40', 20), deck(5, '40', 20)]
    const { main } = buildStockList(rows, decks)
    expect(main.reduce((s, c) => s + c.quantity, 0)).toBe(60)
    expect(main.find((c) => c.name === 'Big')?.quantity).toBe(2)
    expect(main.find((c) => c.name === 'Fill')).toBeUndefined()
  })

  it('classifies a land/spell modal card by its played face', () => {
    const rows = rowsFrom({
      1: [['Island', 1, BASIC], ['Mdfc', 1, 'Sorcery']],
    })
    const { main } = buildStockList(rows, [deck(1)])
    // One land slot (Island) and one non-land slot, which the sorcery face fills.
    expect(names(main).sort()).toEqual(['Island', 'Mdfc'])
  })

  it('fills the sideboard to its median size, allowing main cards too', () => {
    const side: Line[] = [
      ['Island', 1, BASIC, 'side'],
      ['Side A', 4, INSTANT, 'side'],
      ['Side B', 4, INSTANT, 'side'],
      ['Side C', 3, INSTANT, 'side'],
      ['Side D', 3, INSTANT, 'side'],
    ]
    const rows = rowsFrom({ 1: [...sixty(24, 'a'), ...side], 2: [...sixty(24, 'a'), ...side] })
    const result = buildStockList(rows, [deck(1), deck(2)])
    expect(result.side.reduce((s, c) => s + c.quantity, 0)).toBe(15)
    expect(names(result.side)).toContain('Island')
    expect(names(result.main)).toContain('Island')
  })

  it('has no sideboard when the median sideboard is 0', () => {
    const rows = rowsFrom({
      1: sixty(24, 'a'),
      2: sixty(24, 'a'),
      3: [...sixty(24, 'a'), ['Side', 4, INSTANT, 'side']],
    })
    expect(buildStockList(rows, [deck(1), deck(2), deck(3)]).side).toEqual([])
  })

  it('ignores decks outside the analysed corpus', () => {
    const rows = rowsFrom({ 1: [['Card A', 4, INSTANT]], 99: [['Card Z', 4, INSTANT]] })
    const result = buildStockList(rows, [deck(1)])
    expect(result.deckCount).toBe(1)
    expect(names(result.main)).toEqual(['Card A'])
  })

  it('returns an empty result when no rows match the corpus', () => {
    expect(buildStockList([], [deck(1)])).toEqual({ main: [], side: [], deckCount: 0 })
  })
})
