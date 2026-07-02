// Build MTG Arena deck-export text from a deck's cards. Arena reads a plain-text
// list of "<qty> <name>" lines under a `Deck` header and a `Sideboard` header.
// When a card carries a canonical non-foil printing (set + collector number), we
// append "(SET) NUM" so Arena imports that exact printing; otherwise we emit the
// name alone. Scryfall printing columns are null until the Scryfall-mapping change
// lands, so exports fall back to the scraped name via that path.

import type { FormatCode } from './formats'

export interface ArenaCard {
  quantity: number
  /** Best available card name (Scryfall canonical when present, else scraped). */
  name: string
  setCode?: string | null
  collectorNumber?: string | null
}

// Formats playable on MTG Arena — their export copies to the clipboard. The rest
// are paper-only and download a .txt instead.
const ARENA_FORMATS: readonly FormatCode[] = ['ST', 'PI']

/** Whether a format's export is delivered via clipboard or a file download. */
export function arenaDelivery(format: FormatCode): 'clipboard' | 'download' {
  return ARENA_FORMATS.includes(format) ? 'clipboard' : 'download'
}

function cardLine(card: ArenaCard): string {
  const printing = card.setCode && card.collectorNumber ? ` (${card.setCode}) ${card.collectorNumber}` : ''
  return `${card.quantity} ${card.name}${printing}`
}

/** Render a deck as MTG Arena import text. When `name` is given, an `About` block
 * names the deck (Arena reads `About` / `Name <deck name>` at the top of the list). */
export function buildArenaDeck(main: ArenaCard[], side: ArenaCard[], name?: string): string {
  const sections: string[] = []
  const deckName = name?.trim()
  if (deckName) {
    sections.push(`About\nName ${deckName}`)
  }
  sections.push(['Deck', ...main.map(cardLine)].join('\n'))
  if (side.length > 0) {
    sections.push(['Sideboard', ...side.map(cardLine)].join('\n'))
  }
  return sections.join('\n\n')
}

/** Slugified `.txt` filename for a downloaded decklist. */
export function arenaFilename(archetypeName: string): string {
  const slug = archetypeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'decklist'}.txt`
}
