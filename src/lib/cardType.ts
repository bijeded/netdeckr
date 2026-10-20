/** The four mainboard display groups, in fixed render order. */
export type CardTypeCategory = 'lands' | 'creatures' | 'spells' | 'other'

/**
 * Classify a card by its Scryfall type line into a display group.
 *
 * Precedence: Land beats Creature beats Instant/Sorcery/Enchantment beats
 * everything else. So a Land Creature (Dryad Arbor) is a land, and an
 * Artifact/Enchantment Creature is a creature. A missing type line (an
 * unresolved Scryfall mapping) falls into `other` so nothing is hidden.
 */
export function cardCategory(typeLine: string | null | undefined): CardTypeCategory {
  const type = (typeLine ?? '').toLowerCase()
  if (type.includes('land')) return 'lands'
  if (type.includes('creature')) return 'creatures'
  if (type.includes('instant') || type.includes('sorcery') || type.includes('enchantment')) return 'spells'
  return 'other'
}

/** The Analysis tab's card-type split, finer than the decklist groups, in display order. */
export const CARD_TYPES = [
  'lands',
  'creatures',
  'planeswalkers',
  'battles',
  'artifacts',
  'enchantments',
  'instants',
  'sorceries',
  'other',
] as const

export type CardType = (typeof CARD_TYPES)[number]

// Precedence for a multi-type card: the first of its types in this order wins.
const TYPE_PRECEDENCE: [word: string, type: CardType][] = [
  ['land', 'lands'],
  ['creature', 'creatures'],
  ['planeswalker', 'planeswalkers'],
  ['battle', 'battles'],
  ['artifact', 'artifacts'],
  ['enchantment', 'enchantments'],
  ['instant', 'instants'],
  ['sorcery', 'sorceries'],
]

/**
 * Classify a card by its Scryfall type line into one card type, for the
 * Analysis tab's type split. Unlike `cardCategory`, only the types before the
 * "—" are read, so a subtype never stands in for a type. Kindred has no bucket:
 * it always accompanies another type, which decides. A missing type line falls
 * into `other`.
 */
export function cardType(typeLine: string | null | undefined): CardType {
  const types = (typeLine ?? '').split('—')[0].toLowerCase().split(/\s+/)
  for (const [word, type] of TYPE_PRECEDENCE) {
    if (types.includes(word)) return type
  }
  return 'other'
}

/** A mainboard line carrying enough to classify and render it. */
interface TypedLine {
  typeLine?: string | null
}

/** Group mainboard lines by card type, preserving input order within each bucket. */
export function groupMainByType<T extends TypedLine>(lines: T[]): Record<CardTypeCategory, T[]> {
  const grouped: Record<CardTypeCategory, T[]> = { lands: [], creatures: [], spells: [], other: [] }
  for (const line of lines) {
    grouped[cardCategory(line.typeLine)].push(line)
  }
  return grouped
}
