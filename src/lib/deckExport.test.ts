import { describe, it, expect } from 'vitest'
import {
  buildArenaDeck,
  buildMtgoDeck,
  exportTarget,
  mtgoName,
  type ExportCard,
  type MtgoExportCard,
} from './deckExport'

const main: ExportCard[] = [
  { quantity: 4, name: 'Lightning Bolt' },
  { quantity: 2, name: 'Opt' },
]
const side: ExportCard[] = [{ quantity: 3, name: 'Negate' }]

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
    const withPrinting: ExportCard[] = [
      { quantity: 4, name: 'Lightning Bolt', setCode: 'MH2', collectorNumber: '401' },
    ]
    expect(buildArenaDeck(withPrinting, [])).toBe('Deck\n4 Lightning Bolt (MH2) 401')
  })

  it('omits the printing when only one of set/collector is present', () => {
    const partial: ExportCard[] = [
      { quantity: 1, name: 'Opt', setCode: 'ELD', collectorNumber: null },
    ]
    expect(buildArenaDeck(partial, [])).toBe('Deck\n1 Opt')
  })

  it('returns just the Deck header when the mainboard is empty', () => {
    expect(buildArenaDeck([], [])).toBe('Deck')
  })

  it('prepends an About/Name block when a deck name is given', () => {
    expect(buildArenaDeck(main, side, 'Izzet Control')).toBe(
      'About\nName Izzet Control\n\nDeck\n4 Lightning Bolt\n2 Opt\n\nSideboard\n3 Negate',
    )
  })

  it('omits the About block for a blank deck name', () => {
    expect(buildArenaDeck(main, [], '   ')).toBe('Deck\n4 Lightning Bolt\n2 Opt')
  })
})

describe('exportTarget', () => {
  it('targets MTG Arena for Standard and Pioneer', () => {
    expect(exportTarget('ST')).toBe('arena')
    expect(exportTarget('PI')).toBe('arena')
  })

  it('targets MTGO for Modern, Pauper, and Pre-Modern', () => {
    expect(exportTarget('MO')).toBe('mtgo')
    expect(exportTarget('PAU')).toBe('mtgo')
    expect(exportTarget('PREM')).toBe('mtgo')
  })
})

const card = (quantity: number, name: string, scrapedName = name): MtgoExportCard => ({
  quantity,
  name,
  scrapedName,
})

describe('mtgoName', () => {
  it('writes a double-faced card by its front face', () => {
    expect(
      mtgoName(card(4, 'Ajani, Nacatl Pariah // Ajani, Nacatl Avenger', 'Ajani, Nacatl Pariah')),
    ).toBe('Ajani, Nacatl Pariah')
  })

  it('writes an adventure card by its front face', () => {
    expect(mtgoName(card(2, 'Bonecrusher Giant // Stomp', 'Bonecrusher Giant'))).toBe('Bonecrusher Giant')
  })

  it("joins a split card's halves with an unspaced slash", () => {
    expect(mtgoName(card(2, 'Wear // Tear', 'Wear / Tear'))).toBe('Wear/Tear')
  })

  it("keeps a single-face card's canonical name", () => {
    expect(mtgoName(card(4, 'Ragavan, Nimble Pilferer'))).toBe('Ragavan, Nimble Pilferer')
  })

  it('falls back to the scraped name for an unmapped split card, unspaced', () => {
    expect(mtgoName(card(1, 'Fire / Ice'))).toBe('Fire/Ice')
  })

  it('falls back to the scraped name for an unmapped single-face card', () => {
    expect(mtgoName(card(1, 'Delver of Secrets'))).toBe('Delver of Secrets')
  })
})

describe('buildMtgoDeck', () => {
  const mtgoMain: MtgoExportCard[] = [
    card(4, 'Ajani, Nacatl Pariah // Ajani, Nacatl Avenger', 'Ajani, Nacatl Pariah'),
    { ...card(4, 'Ragavan, Nimble Pilferer'), setCode: 'MH2', collectorNumber: '138' },
  ]
  const mtgoSide: MtgoExportCard[] = [card(2, 'Wear // Tear', 'Wear / Tear')]

  it('emits mainboard lines, one empty line, then sideboard lines, CRLF-separated', () => {
    expect(buildMtgoDeck(mtgoMain, mtgoSide)).toBe(
      '4 Ajani, Nacatl Pariah\r\n4 Ragavan, Nimble Pilferer\r\n\r\n2 Wear/Tear',
    )
  })

  it('has no headers, deck name, or printings', () => {
    const text = buildMtgoDeck(mtgoMain, mtgoSide)
    expect(text).not.toMatch(/^(About|Name|Deck|Sideboard)\b/m)
    expect(text).not.toMatch(/\(MH2\)|138/)
  })

  it('omits the empty line when there is no sideboard', () => {
    expect(buildMtgoDeck(mtgoMain, [])).toBe('4 Ajani, Nacatl Pariah\r\n4 Ragavan, Nimble Pilferer')
  })
})
