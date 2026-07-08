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
