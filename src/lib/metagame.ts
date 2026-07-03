// Pure derivation of the metagame breakdown from the decks we scraped. Decks are
// the single source of truth: an archetype's share is its deck count over the
// window's total, so the archetype cards and their drill-down decks are the same
// entities (no name-mismatch, no empty cards). Lives here (not in JSX or the hook)
// so it is unit-testable.

/** One archetype's share of the metagame, as rendered on an archetype card. */
export interface ArchetypeShare {
  rank: number
  name: string
  colorIdentity: string
  sharePct: number
  /** Signature-card normal-size art (hotlinked Scryfall CDN), when computed; else null. */
  artImageUrl: string | null
  /** Signature-card cropped art (hotlinked Scryfall CDN), when computed; else null. */
  artCropUrl: string | null
}

/** The per-deck facts the breakdown needs — one entry per deck in the window. */
export interface DeckForBreakdown {
  archetypeName: string
  colorIdentity: string
  artImageUrl: string | null
  artCropUrl: string | null
}

// How many archetypes the breakdown grid shows.
const TOP_N = 20

/**
 * Group the window's decks by archetype and rank them into a breakdown: each
 * archetype's share is its deck count over the total number of (named) decks.
 * Ranked by deck count descending, then archetype name ascending for a stable
 * tiebreak, capped at the top 20. Color identity and art are taken from the
 * archetype (identical across its decks). Decks with no archetype name are ignored.
 */
export function deriveBreakdown(decks: DeckForBreakdown[]): ArchetypeShare[] {
  const groups = new Map<string, { count: number; sample: DeckForBreakdown }>()
  for (const deck of decks) {
    if (!deck.archetypeName) continue
    const group = groups.get(deck.archetypeName)
    if (group) group.count += 1
    else groups.set(deck.archetypeName, { count: 1, sample: deck })
  }

  const total = [...groups.values()].reduce((sum, g) => sum + g.count, 0)

  return [...groups.entries()]
    .map(([name, g]) => ({
      name,
      count: g.count,
      colorIdentity: g.sample.colorIdentity,
      artImageUrl: g.sample.artImageUrl,
      artCropUrl: g.sample.artCropUrl,
      sharePct: total > 0 ? (g.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_N)
    .map((s, index) => ({
      rank: index + 1,
      name: s.name,
      colorIdentity: s.colorIdentity,
      sharePct: s.sharePct,
      artImageUrl: s.artImageUrl,
      artCropUrl: s.artCropUrl,
    }))
}
