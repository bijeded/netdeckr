// Tier classification of an archetype, mirroring the design system's tier badges:
// T1 (dominant) → T2 → T3 → Otros (fringe). The tier is assigned from an
// archetype's performance (Power Score, see lib/powerScore.ts), not its metagame
// share — so this is now just the shared tier vocabulary.
export type Tier = 'T1' | 'T2' | 'T3' | 'Otros'

/** The four tiers in display order, shared by every control that lists them. */
export const TIER_ORDER: Tier[] = ['T1', 'T2', 'T3', 'Otros']
