// Performance-based archetype scoring, derived only from deck final standings
// (placements). Pure and unit-testable (no JSX, no data access). The metagame
// share stays popularity; Power Score measures how *deep* an archetype finishes
// when it appears — see openspec/changes/add-power-score-tiers/design.md.

import type { Tier } from './tiers'

/** Direction of a window-over-window performance change (arrow-only in the UI). */
export type Trend = 'up' | 'down' | 'flat'

// Calibration constants (tunable; property tests do not depend on exact values).
const Z_DEFAULT = 1.5 // Wilson z: larger ⇒ harsher small-sample penalty.
const TREND_EPS = 0.02 // Deadband on the 0–1 quality scale for a flat trend.
const MIN_TREND_DECKS = 3 // Min usable recent placements before showing ▲/▼.

// Strongest → weakest; a class index counted from the top maps into this.
const TIER_ORDER: Tier[] = ['T1', 'T2', 'T3', 'Otros']

/**
 * Finish quality of a single standing, in (0, 1], bucketed by MTGTop8's
 * single-elimination brackets. The leading integer is used, so range labels
 * ("3-4") and bare Swiss ranks ("3", "12") bucket identically. Empty or
 * unparseable placements return null (no usable standing).
 */
export function finishQuality(placement: string): number | null {
  const match = placement.match(/\d+/)
  if (!match) return null
  const n = Number(match[0])
  if (n <= 0) return null
  if (n === 1) return 1.0 // champion
  if (n === 2) return 0.8 // finalist
  if (n <= 4) return 0.65 // top 4
  if (n <= 8) return 0.45 // top 8
  if (n <= 16) return 0.3 // top 16
  if (n <= 32) return 0.18 // top 32
  return 0.1 // beyond
}

/** The usable finish qualities of a set of placements (unparseable ones dropped). */
function usableQualities(placements: string[]): number[] {
  const out: number[] = []
  for (const placement of placements) {
    const q = finishQuality(placement)
    if (q !== null) out.push(q)
  }
  return out
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Mean finish quality across the usable placements, or null when none are usable. */
export function meanQuality(placements: string[]): number | null {
  const q = usableQualities(placements)
  return q.length === 0 ? null : mean(q)
}

/**
 * Wilson score interval lower bound for a proportion `pHat` observed over `n`
 * trials. Shrinks uncertain (small-n) estimates toward the low end without a
 * hard cutoff; approaches `pHat` as `n` grows. Clamped to [0, 1]; 0 for n ≤ 0.
 */
export function wilsonLowerBound(pHat: number, n: number, z: number = Z_DEFAULT): number {
  if (n <= 0) return 0
  pHat = Math.max(0, Math.min(1, pHat)) // guard the public API against out-of-range proportions
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = pHat + z2 / (2 * n)
  const margin = z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n)
  const lb = (center - margin) / denom
  return Math.max(0, Math.min(1, lb))
}

/**
 * An archetype's Power Score in [0, 100]: the Wilson lower bound of its mean
 * finish quality over its usable placements, scaled ×100. Using the *mean*
 * (not a sum) means volume can't buy score — only depth. Returns 0 when the
 * archetype has no usable placement.
 */
export function archetypePowerScore(placements: string[], z: number = Z_DEFAULT): number {
  const q = usableQualities(placements)
  if (q.length === 0) return 0
  return wilsonLowerBound(mean(q), q.length, z) * 100
}

/** Sum of squared deviations of sorted[a..b] (inclusive) from their mean, via prefix sums. */
function ssqFactory(sorted: number[]): (a: number, b: number) => number {
  const n = sorted.length
  const s1 = new Array(n + 1).fill(0)
  const s2 = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) {
    s1[i + 1] = s1[i] + sorted[i]
    s2[i + 1] = s2[i] + sorted[i] * sorted[i]
  }
  return (a, b) => {
    const count = b - a + 1
    const sum = s1[b + 1] - s1[a]
    return s2[b + 1] - s2[a] - (sum * sum) / count
  }
}

/**
 * 1-D Fisher–Jenks optimal natural breaks. Returns the interior break values
 * (the lower value of each class above the first), so `classes - 1` entries for
 * `classes` classes. Degrades gracefully: `classes` is clamped to the number of
 * distinct values, so a single distinct value yields no breaks.
 */
export function jenksBreaks(values: number[], classes: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return []
  const distinct = new Set(sorted).size
  const k = Math.max(1, Math.min(Math.floor(classes), distinct))
  if (k <= 1) return []

  const ssq = ssqFactory(sorted)
  // dp[c][j] = min total SSQ splitting the first j elements into c classes.
  // arg[c][j] = the split index m (first m elements form the first c-1 classes).
  const dp = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity))
  const arg = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0))
  for (let j = 1; j <= n; j++) dp[1][j] = ssq(0, j - 1)
  for (let c = 2; c <= k; c++) {
    for (let j = c; j <= n; j++) {
      for (let m = c - 1; m <= j - 1; m++) {
        const cost = dp[c - 1][m] + ssq(m, j - 1)
        if (cost < dp[c][j]) {
          dp[c][j] = cost
          arg[c][j] = m
        }
      }
    }
  }

  const breaks: number[] = []
  let j = n
  for (let c = k; c >= 2; c--) {
    const m = arg[c][j] // class c is sorted[m..j-1]; its lower value is sorted[m]
    breaks.push(sorted[m])
    j = m
  }
  return breaks.reverse()
}

/**
 * Assign each archetype a tier from its Power Score. Tier cutoffs are the Jenks
 * natural breaks of the (positive) `referenceScores`, mapping the strongest
 * cluster to T1 down through the fringe tier; with fewer than four distinct
 * reference scores the clusters map from the top and lower tiers simply do not
 * appear. An archetype with no usable data (score ≤ 0) is placed in the fringe
 * tier directly.
 */
export function assignTiers(
  scores: Map<string, number>,
  referenceScores: number[],
): Map<string, Tier> {
  const breaks = jenksBreaks(
    referenceScores.filter((s) => s > 0),
    TIER_ORDER.length,
  )
  const k = breaks.length + 1
  const result = new Map<string, Tier>()
  for (const [name, score] of scores) {
    if (score <= 0) {
      result.set(name, 'Otros')
      continue
    }
    const classIndex = breaks.filter((b) => score >= b).length // 0..k-1, low→high
    const fromTop = k - 1 - classIndex // classIndex ≤ breaks.length ⇒ fromTop ≥ 0
    result.set(name, TIER_ORDER[Math.min(fromTop, TIER_ORDER.length - 1)])
  }
  return result
}

/**
 * Direction of the selected window's performance versus the 2-week baseline,
 * comparing raw mean finish quality (not the shrunken score, so it reflects a
 * real change and not just a smaller sample). Flat within the deadband, when the
 * recent sample is below the minimum-deck guard, or when there is no usable data.
 */
export function windowTrend(
  selected: string[],
  baseline: string[],
  opts: { eps?: number; minSelected?: number } = {},
): Trend {
  const eps = opts.eps ?? TREND_EPS
  const minSelected = opts.minSelected ?? MIN_TREND_DECKS
  const recent = usableQualities(selected)
  if (recent.length < minSelected) return 'flat'
  const base = usableQualities(baseline)
  if (base.length === 0) return 'flat'
  const diff = mean(recent) - mean(base)
  if (diff > eps) return 'up'
  if (diff < -eps) return 'down'
  return 'flat'
}
