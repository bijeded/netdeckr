// Pure derivations for the archetype Analysis tab: performance figures over the
// format's full Last 2 Weeks corpus, and composition figures over a built stock
// list. Every series is returned already shaped for Recharts, so no data shaping
// happens in JSX. See openspec/changes/archetype-analysis/design.md (Decision 4).
//
// The analysis deliberately ignores the sidebar filters: it takes the whole
// legal corpus and slices it to 2 weeks itself. Share, share change, tier, and
// wins are produced by the grid's own functions over that slice, so they match
// the archetype card on the unfiltered Last 2 Weeks view by construction.

import { cardCategory, type CardTypeCategory } from './cardType'
import { exportTarget } from './deckExport'
import type { FormatCode } from './formats'
import { attachPowerTiers, deriveBreakdown, type DeckForBreakdown } from './metagame'
import { archetypePowerScore, finishQuality } from './powerScore'
import { shareDeltas, type ShareDelta } from './shareDelta'
import { EVENT_SIZE_CLASSES, sizeClassOf, type EventSizeClass } from './eventSize'
import type { StockCard } from './stockList'
import type { Tier } from './tiers'
import { windowStartISO } from './windows'

/** One legal deck of the format's retained corpus, unfiltered. */
export interface AnalysisDeck {
  id: number
  archetypeId: number | null
  archetypeName: string
  colorIdentity: string
  artImageUrl: string | null
  artCropUrl: string | null
  placement: string
  eventId: number | null
  /** ISO date (YYYY-MM-DD); null when MTGTop8 omitted it — such decks are outside every window. */
  eventDate: string | null
  playerCount: number | null
  /** The deck's event publishes presentation order, not standings (see `isUnrankedEvent`). */
  unranked: boolean
}

/** Below this many analysed decks the composition sections carry a small-sample label. */
export const MIN_ANALYSIS_DECKS = 5

export type FunnelBucket = 'first' | 'second' | 'top4' | 'top8' | 'deeper'
export const FUNNEL_BUCKETS: FunnelBucket[] = ['first', 'second', 'top4', 'top8', 'deeper']

export interface FunnelPoint {
  bucket: FunnelBucket
  count: number
}

export interface SizePoint {
  sizeClass: EventSizeClass
  decks: number
  /** Mean finish quality of the class's ranked decks, 0–100; null when none are ranked. */
  avgFinish: number | null
}

export interface DayPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** The archetype's share of that day's decks, 0–100; null on a day without events. */
  sharePct: number | null
}

export interface Performance {
  deckCount: number
  eventCount: number
  wins: number
  sharePct: number
  shareDelta: ShareDelta | null
  tier: Tier
  powerScore: number
  /** Decks from ranked events with a parseable standing — the funnel's population. */
  rankedDecks: number
  /** Decks from unranked events (e.g. MTGO Leagues), kept out of the funnel. */
  unrankedDecks: number
  /** Share of ranked decks finishing Top 8 or better, 0–100; null with no ranked decks. */
  top8Rate: number | null
  funnel: FunnelPoint[]
  bySize: SizePoint[]
  sharePerDay: DayPoint[]
}

const TWO_WEEKS = '2weeks'

/** The corpus decks inside the Last 2 Weeks window. Date-less decks are outside it. */
export function twoWeekDecks(corpus: AnalysisDeck[], now: Date = new Date()): AnalysisDeck[] {
  const start = windowStartISO(TWO_WEEKS, now)
  return corpus.filter((d) => d.eventDate !== null && d.eventDate >= start)
}

/** Funnel bucket of a standing, or null when it has no usable number. */
export function funnelBucket(placement: string): FunnelBucket | null {
  const match = placement.match(/\d+/)
  if (!match) return null
  const n = Number(match[0])
  if (n <= 0) return null
  if (n === 1) return 'first'
  if (n === 2) return 'second'
  if (n <= 4) return 'top4'
  if (n <= 8) return 'top8'
  return 'deeper'
}

function pushTo<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key)
  if (arr) arr.push(value)
  else map.set(key, [value])
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function forBreakdown(d: AnalysisDeck): DeckForBreakdown {
  return {
    archetypeName: d.archetypeName,
    colorIdentity: d.colorIdentity,
    placement: d.placement,
    artImageUrl: d.artImageUrl,
    artCropUrl: d.artCropUrl,
  }
}

/**
 * The archetype's performance over the format's Last 2 Weeks, from the whole
 * legal corpus (the extra preceding 2 weeks feed only the share change).
 * Returns null when the archetype has no deck in the window.
 */
export function analysePerformance(
  corpus: AnalysisDeck[],
  archetypeName: string,
  now: Date = new Date(),
): Performance | null {
  const field = twoWeekDecks(corpus, now)
  const own = field.filter((d) => d.archetypeName === archetypeName)
  if (own.length === 0) return null

  // Share and wins, exactly as the grid derives them for the 2-week window.
  const breakdown = deriveBreakdown(field.map(forBreakdown))
  const entry = breakdown.find((a) => a.name === archetypeName)

  // Tier, through the grid's own tiering over the same 2-week field.
  const placements = new Map<string, string[]>()
  const sizes = new Map<string, (number | null)[]>()
  const unranked = new Map<string, boolean[]>()
  for (const d of field) {
    pushTo(placements, d.archetypeName, d.placement)
    pushTo(sizes, d.archetypeName, d.playerCount)
    pushTo(unranked, d.archetypeName, d.unranked)
  }
  const [tiered] = attachPowerTiers(entry ? [entry] : [], {
    twoWeekPlacements: placements,
    twoWeekSizes: sizes,
    twoWeekUnranked: unranked,
    twoWeekFieldNames: breakdown.map((a) => a.name),
    selectedPlacements: placements,
    isBaseline: true,
  })
  const powerScore = archetypePowerScore(
    placements.get(archetypeName) ?? [],
    sizes.get(archetypeName) ?? [],
    unranked.get(archetypeName) ?? [],
  )

  const deltas = shareDeltas(
    corpus.map((d) => ({ archetypeName: d.archetypeName, eventDate: d.eventDate })),
    TWO_WEEKS,
    now,
  )

  // Funnel and top-8 rate count ranked decks only: an unranked event's "1, 2, 3…"
  // is listing order and would otherwise mint champions.
  const funnelCounts = new Map<FunnelBucket, number>(FUNNEL_BUCKETS.map((b) => [b, 0]))
  let rankedDecks = 0
  let unrankedDecks = 0
  const sizeAcc = new Map<EventSizeClass, { decks: number; qualities: number[] }>()
  for (const d of own) {
    const sizeClass = sizeClassOf(d.playerCount)
    const acc = sizeAcc.get(sizeClass) ?? { decks: 0, qualities: [] }
    acc.decks += 1
    sizeAcc.set(sizeClass, acc)
    if (d.unranked) {
      unrankedDecks += 1
      continue
    }
    const bucket = funnelBucket(d.placement)
    if (bucket === null) continue
    rankedDecks += 1
    funnelCounts.set(bucket, (funnelCounts.get(bucket) ?? 0) + 1)
    const q = finishQuality(d.placement)
    if (q !== null) acc.qualities.push(q)
  }
  const top8Count = rankedDecks - (funnelCounts.get('deeper') ?? 0)

  const bySize: SizePoint[] = EVENT_SIZE_CLASSES.flatMap((sizeClass) => {
    const acc = sizeAcc.get(sizeClass)
    if (!acc) return []
    const avgFinish =
      acc.qualities.length === 0
        ? null
        : (acc.qualities.reduce((s, q) => s + q, 0) / acc.qualities.length) * 100
    return [{ sizeClass, decks: acc.decks, avgFinish }]
  })

  // Share per day across the window; a day with no decks at all has no value.
  const dayTotals = new Map<string, number>()
  const dayOwn = new Map<string, number>()
  for (const d of field) {
    const day = d.eventDate as string
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + 1)
    if (d.archetypeName === archetypeName) dayOwn.set(day, (dayOwn.get(day) ?? 0) + 1)
  }
  const sharePerDay: DayPoint[] = []
  const today = now.toISOString().slice(0, 10)
  for (let day = windowStartISO(TWO_WEEKS, now); day <= today; day = addDays(day, 1)) {
    const total = dayTotals.get(day) ?? 0
    sharePerDay.push({ date: day, sharePct: total === 0 ? null : ((dayOwn.get(day) ?? 0) / total) * 100 })
  }

  return {
    deckCount: own.length,
    eventCount: new Set(own.map((d) => d.eventId).filter((id) => id !== null)).size,
    wins: entry?.wins ?? 0,
    sharePct: entry?.sharePct ?? 0,
    shareDelta: deltas?.get(archetypeName) ?? null,
    tier: tiered?.tier ?? 'Otros',
    powerScore,
    rankedDecks,
    unrankedDecks,
    top8Rate: rankedDecks === 0 ? null : (top8Count / rankedDecks) * 100,
    funnel: FUNNEL_BUCKETS.map((bucket) => ({ bucket, count: funnelCounts.get(bucket) ?? 0 })),
    bySize,
    sharePerDay,
  }
}

export interface CurvePoint {
  /** Mana value bucket label: "0" … "5", then the open-ended "6+". */
  manaValue: string
  count: number
}

export const CURVE_LABELS = ['0', '1', '2', '3', '4', '5', '6+']

/**
 * Non-land card counts of a mainboard by mana value, with an open-ended top
 * bucket. A card without a resolved mana value is left out rather than guessed.
 */
export function manaCurve(main: StockCard[]): CurvePoint[] {
  const counts = CURVE_LABELS.map(() => 0)
  for (const card of main) {
    if (cardCategory(card.typeLine) === 'lands' || card.cmc === null) continue
    counts[Math.min(Math.floor(card.cmc), CURVE_LABELS.length - 1)] += card.quantity
  }
  return CURVE_LABELS.map((manaValue, i) => ({ manaValue, count: counts[i] }))
}

export interface TypeSplitPoint {
  category: CardTypeCategory
  count: number
}

/** Mainboard card counts by the decklist type classification, in display order. */
export function typeSplit(main: StockCard[]): TypeSplitPoint[] {
  const order: CardTypeCategory[] = ['lands', 'creatures', 'spells', 'other']
  const counts = new Map<CardTypeCategory, number>(order.map((c) => [c, 0]))
  for (const card of main) {
    const category = cardCategory(card.typeLine)
    counts.set(category, (counts.get(category) ?? 0) + card.quantity)
  }
  return order.map((category) => ({ category, count: counts.get(category) ?? 0 }))
}

export type WildcardRarity = 'mythic' | 'rare' | 'uncommon' | 'common'
export const WILDCARD_RARITIES: WildcardRarity[] = ['mythic', 'rare', 'uncommon', 'common']

export type WildcardCost = Record<WildcardRarity, number>

// A playset is the most copies Arena ever asks you to own.
const MAX_COPIES = 4

/**
 * Wildcards needed to build a stock list on MTG Arena, or null for a format not
 * played there. Basic lands are free. A card in both boards needs its combined
 * copies, capped at a playset. Rarity is the stored printing's, so this is an
 * approximation of Arena's own rarity.
 */
export function wildcardCost(main: StockCard[], side: StockCard[], format: FormatCode): WildcardCost | null {
  if (exportTarget(format) !== 'arena') return null
  const copies = new Map<string, { quantity: number; rarity: string | null }>()
  for (const card of [...main, ...side]) {
    if ((card.typeLine ?? '').includes('Basic')) continue
    const entry = copies.get(card.name) ?? { quantity: 0, rarity: card.rarity }
    entry.quantity += card.quantity
    copies.set(card.name, entry)
  }
  const cost: WildcardCost = { mythic: 0, rare: 0, uncommon: 0, common: 0 }
  for (const { quantity, rarity } of copies.values()) {
    if (rarity && (WILDCARD_RARITIES as string[]).includes(rarity)) {
      cost[rarity as WildcardRarity] += Math.min(quantity, MAX_COPIES)
    }
  }
  return cost
}
