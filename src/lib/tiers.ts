// Tier classification of a metagame share, mirroring the design system's
// tierFor: T1 (dominant) → T2 → T3 → Otros (fringe).
export type Tier = 'T1' | 'T2' | 'T3' | 'Otros'

export function tierFor(pct: number): Tier {
  if (pct >= 10) return 'T1'
  if (pct >= 5) return 'T2'
  if (pct >= 1) return 'T3'
  return 'Otros'
}
