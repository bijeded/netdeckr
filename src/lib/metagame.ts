// Pure derivation of the metagame breakdown from the decks we scraped. Decks are
// the single source of truth: an archetype's share is its deck count over the
// window's total, so the archetype cards and their drill-down decks are the same
// entities (no name-mismatch, no empty cards). Lives here (not in JSX or the hook)
// so it is unit-testable.

import type { Tier } from './tiers'
import { archetypePowerScore, assignTiers, windowTrend, T1_MIN_DECKS, type Trend } from './powerScore'
import { placementBadge } from './placement'

/** The popularity-ranked shape `deriveBreakdown` produces (before performance is attached). */
export interface RankedArchetype {
  rank: number
  name: string
  colorIdentity: string
  sharePct: number
  /** Number of first-place decks in the (filtered) view — drives the win trophy. */
  wins: number
  /** Signature-card normal-size art (hotlinked Scryfall CDN), when computed; else null. */
  artImageUrl: string | null
  /** Signature-card cropped art (hotlinked Scryfall CDN), when computed; else null. */
  artCropUrl: string | null
}

/** A ranked archetype plus its performance signals, as rendered on an archetype card. */
export interface ArchetypeShare extends RankedArchetype {
  /** Performance tier, from the archetype's 2-week Power Score (not its share). */
  tier: Tier
  /** Selected-window-vs-2-week momentum, or null on the baseline window (no arrow). */
  trend: Trend | null
}

/** The per-deck facts the breakdown needs — one entry per deck in the window. */
export interface DeckForBreakdown {
  archetypeName: string
  colorIdentity: string
  /** Raw MTGTop8 finish label ("1", "3-4", …) — drives the Power Score, not the share. */
  placement: string
  artImageUrl: string | null
  artCropUrl: string | null
}

/** Inputs for attaching the stable 2-week tier and the selected-window trend. */
export interface PowerContext {
  /** All 2-week placements per archetype (the stable corpus behind the tier). */
  twoWeekPlacements: Map<string, string[]>
  /** Per-finish tournament sizes aligned with `twoWeekPlacements` (null = unknown → small-event weight). */
  twoWeekSizes: Map<string, (number | null)[]>
  /** The whole 2-week corpus of archetype names — the reference field whose natural breaks set the cutoffs. */
  twoWeekFieldNames: string[]
  /** The selected window's placements per archetype (drives the trend). */
  selectedPlacements: Map<string, string[]>
  /** True when the selected window IS the 2-week baseline (⇒ no trend arrow). */
  isBaseline: boolean
}

/**
 * How many archetypes the default (unfiltered, time-frame-only) grid shows. This
 * is only a **display** cap applied by the caller — it is intentionally decoupled
 * from the tier reference field, which spans the whole corpus (see `deriveBreakdown`).
 */
export const GRID_DISPLAY_CAP = 12

/**
 * Group the window's decks by archetype and rank them into a breakdown: each
 * archetype's share is its deck count over the total number of (named) decks.
 * Ranked by deck count descending, then archetype name ascending for a stable
 * tiebreak. Returns **every** archetype uncapped by default (so the tier field and
 * the archetype filter can see the whole corpus); pass `cap` to slice to the top N
 * for display. Color identity and art are taken from the archetype (identical
 * across its decks). Decks with no archetype name are ignored.
 */
export function deriveBreakdown(decks: DeckForBreakdown[], cap?: number): RankedArchetype[] {
  const groups = new Map<string, { count: number; wins: number; sample: DeckForBreakdown }>()
  for (const deck of decks) {
    if (!deck.archetypeName) continue
    const isWin = placementBadge(deck.placement).kind === 'first'
    const group = groups.get(deck.archetypeName)
    if (group) {
      group.count += 1
      if (isWin) group.wins += 1
    } else {
      groups.set(deck.archetypeName, { count: 1, wins: isWin ? 1 : 0, sample: deck })
    }
  }

  const total = [...groups.values()].reduce((sum, g) => sum + g.count, 0)

  return [...groups.entries()]
    .map(([name, g]) => ({
      name,
      count: g.count,
      wins: g.wins,
      colorIdentity: g.sample.colorIdentity,
      artImageUrl: g.sample.artImageUrl,
      artCropUrl: g.sample.artCropUrl,
      sharePct: total > 0 ? (g.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, cap ?? Infinity)
    .map((s, index) => ({
      rank: index + 1,
      name: s.name,
      colorIdentity: s.colorIdentity,
      sharePct: s.sharePct,
      wins: s.wins,
      artImageUrl: s.artImageUrl,
      artCropUrl: s.artCropUrl,
    }))
}

/**
 * Attach the performance signals to a displayed breakdown. The tier is the
 * archetype's **2-week** Power Score classified against the natural breaks of the
 * whole 2-week corpus field — so it is stable no matter which window is shown. The trend
 * compares the selected window's finish quality to the 2-week baseline, and is
 * null on the baseline window itself (no arrow). Pure, so it stays unit-testable.
 */
export function attachPowerTiers(displayed: RankedArchetype[], ctx: PowerContext): ArchetypeShare[] {
  // Score each archetype's 2-week corpus once (a displayed archetype is often also
  // in the reference field), so the reference and per-archetype scores share work.
  const scoreCache = new Map<string, number>()
  const scoreOf = (name: string): number => {
    let score = scoreCache.get(name)
    if (score === undefined) {
      score = archetypePowerScore(
        ctx.twoWeekPlacements.get(name) ?? [],
        ctx.twoWeekSizes.get(name) ?? [],
      )
      scoreCache.set(name, score)
    }
    return score
  }

  const referenceScores = ctx.twoWeekFieldNames.map(scoreOf)
  const scores = new Map<string, number>()
  const deckCounts = new Map<string, number>()
  for (const archetype of displayed) {
    scores.set(archetype.name, scoreOf(archetype.name))
    // The Tier-1 floor counts an archetype's supporting decks in the 2-week corpus.
    deckCounts.set(archetype.name, (ctx.twoWeekPlacements.get(archetype.name) ?? []).length)
  }
  const tiers = assignTiers(scores, referenceScores, { deckCounts, t1MinDecks: T1_MIN_DECKS })

  return displayed.map((archetype) => ({
    ...archetype,
    tier: tiers.get(archetype.name) ?? 'Otros',
    trend: ctx.isBaseline
      ? null
      : windowTrend(
          ctx.selectedPlacements.get(archetype.name) ?? [],
          ctx.twoWeekPlacements.get(archetype.name) ?? [],
        ),
  }))
}
