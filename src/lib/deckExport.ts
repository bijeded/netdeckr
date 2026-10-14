// Build clipboard deck-export text for the client a format is played on: MTG
// Arena for Standard/Pioneer, Magic Online (MTGO) for Modern/Pauper/Pre-Modern.
//
// Arena reads a plain-text list of "<qty> <name>" lines under a `Deck` header and
// a `Sideboard` header. When a card carries a canonical non-foil printing (set +
// collector number), we append "(SET) NUM" so Arena imports that exact printing;
// otherwise we emit the name alone.
//
// MTGO reads bare "<qty> <name>" lines, one empty line, then the sideboard — no
// headers, no deck name, no printings — with MTGO's own card naming (see
// `mtgoName`). The shape mirrors MTGGoldfish's MTGO-ready `.txt` download.

import type { FormatCode } from './formats'

export interface ExportCard {
  quantity: number
  /** Best available card name (Scryfall canonical when present, else scraped). */
  name: string
  setCode?: string | null
  collectorNumber?: string | null
}

export interface MtgoExportCard extends ExportCard {
  /** The name as scraped from MTGTop8 — tells split cards from other multi-face cards. */
  scrapedName: string
}

export type ExportTarget = 'arena' | 'mtgo'

// Formats playable on MTG Arena. The rest are MTGO formats.
const ARENA_FORMATS: readonly FormatCode[] = ['ST', 'PI']

/** The client a format's export targets. */
export function exportTarget(format: FormatCode): ExportTarget {
  return ARENA_FORMATS.includes(format) ? 'arena' : 'mtgo'
}

function arenaLine(card: ExportCard): string {
  const printing = card.setCode && card.collectorNumber ? ` (${card.setCode}) ${card.collectorNumber}` : ''
  return `${card.quantity} ${card.name}${printing}`
}

/** Render a deck as MTG Arena import text. When `name` is given, an `About` block
 * names the deck (Arena reads `About` / `Name <deck name>` at the top of the list). */
export function buildArenaDeck(main: ExportCard[], side: ExportCard[], name?: string): string {
  const sections: string[] = []
  const deckName = name?.trim()
  if (deckName) {
    sections.push(`About\nName ${deckName}`)
  }
  sections.push(['Deck', ...main.map(arenaLine)].join('\n'))
  if (side.length > 0) {
    sections.push(['Sideboard', ...side.map(arenaLine)].join('\n'))
  }
  return sections.join('\n\n')
}

/** A card's MTGO name. MTGTop8 writes a split card with both halves ("Fire / Ice")
 * and every other multi-face card (double-faced, MDFC, adventure) by its front
 * face, so the scraped name decides: split cards join their halves with an
 * unspaced "/" ("Fire/Ice"); other "Front // Back" names keep the front face. */
export function mtgoName(card: MtgoExportCard): string {
  if (card.scrapedName.includes('/')) {
    const source = card.name.includes('/') ? card.name : card.scrapedName
    return source
      .split('/')
      .map((half) => half.trim())
      .filter(Boolean)
      .join('/')
  }
  const back = card.name.indexOf(' // ')
  return back === -1 ? card.name : card.name.slice(0, back)
}

/** Render a deck as MTGO import text: mainboard lines, then — when there is a
 * sideboard — one empty line and the sideboard lines, CRLF-separated. */
export function buildMtgoDeck(main: MtgoExportCard[], side: MtgoExportCard[]): string {
  const line = (card: MtgoExportCard) => `${card.quantity} ${mtgoName(card)}`
  const lines = main.map(line)
  if (side.length > 0) {
    lines.push('', ...side.map(line))
  }
  return lines.join('\r\n')
}
