## Why

Today an archetype's tier badge (T1/T2/T3/Rogue) is assigned purely from its metagame **share** — how often the deck shows up — via fixed cutoffs (`tierFor`: ≥10% → T1, ≥5% → T2, ≥1% → T3, else Rogue). That measures popularity, not power: a heavily-played but mediocre deck is flagged top-tier, while a rarely-played but dominant deck is buried. Players choosing what to play need a signal for **win capability**, not hype.

We only have each deck's final standing per event (`1`, `2`, `3-4`, `5-8`, `9-16`, …) — no winrates, and no reliable field size (MTGTop8 publishes only a top cut, and some events have very few decklists), so a true percentile can't be computed and there is survivorship bias (a popular deck's early losses in big events are never published). We need a tiering signal that works within those limits.

## What Changes

- Add a **Power Score**: a per-archetype, per-(format, window) performance metric derived from the placements of that archetype's decks in the window. It measures *how deep the archetype finishes when it appears*, not how often it appears.
- Power Score is built from three pieces (methodology in `design.md`): a **placement → finish-quality** mapping (bracket-based, monotonic), a **Wilson lower-bound** shrink so small/uncertain samples are pulled down without a hard cutoff, and **Jenks natural breaks** to cut the field into T1/T2/T3/Rogue by real gaps in the distribution rather than fixed thresholds.
- **The archetype tier badge is now assigned from Power Score instead of metagame share**, and the badge is **anchored to the Last 2 Weeks corpus** — it is *stable* across the time-frame toggle rather than flipping around on the noisier 5-day sample. One badge, performance-based, steady.
- **A recent-window trend arrow (▲/▼/–)** is added to each card on the **Last 5 Days** view: it compares the recent window's performance to the 2-week baseline, revealing whether an archetype is heating up or cooling off — the performance signal from the window toggle is surfaced as *momentum* instead of a jittery badge. It compares the underlying finish-quality (not the small-sample-shrunken score), so it reflects real change, not just a smaller sample, and a **minimum-recent-deck guard** keeps one or two recent results from swinging it. On the **Last 2 Weeks (baseline) view the arrow is not shown** (there is nothing to compare against); a meaningful baseline-view trend (week-over-week) is deliberately deferred — it is a distinct feature (the handoff's deferred item #3) that needs a history table, which this change does *not* add.
- **Metagame share % is unchanged** — the breakdown derivation, the share number, its one-decimal format, the bar, ranking, and the top-20 grid all stay exactly as-is and continue to reflect the selected window. Only the *badge basis* and the new arrow are added.
- Power Score is **computed but not shown as a raw number** — it surfaces only through the tier badge and the direction-only arrow (no numeric delta), keeping the UI clean and avoiding an opaque statistic.
- **Small samples get no hard floor** — the Wilson lower bound alone controls noise in the badge: a strong record over enough decks can reach a high tier, while a single lucky win is pulled toward the bottom.
- **No new empty states** — an empty window uses the existing empty/loading/error handling; an archetype with no usable placement data lands in the lowest tier (Rogue/Otros). The fringe tier label stays localized (EN "Rogue" / ES "Otros"); T1/T2/T3 stay universal.
- Computation is **client-side**. Because the 2-week window already contains the 5-day one, the hook fetches the 2-week corpus once and derives the selected window by a client-side date filter — so both the stable 2-week tier and the selected-window trend come from a single fetch. **No schema change, no scraper change, no new dependency, no history table.** The only new strings are localized accessible labels for the trend arrow.

## Capabilities

### New Capabilities
<!-- None — the observable behavior lives in the existing breakdown view; the scoring methodology is an implementation detail captured in design.md. -->

### Modified Capabilities
- `metagame-breakdown-view`: the archetype card's tier badge is now assigned from a performance-based **Power Score** (derived from the window's deck placements) instead of from metagame share; adds requirements for the score's inputs, small-sample handling, natural-break tier cutoffs, and the no-usable-data / empty behaviors. Metagame-share requirements are untouched.

## Impact

- **Frontend only.** New `src/lib/powerScore.ts` (finish-quality mapping, mean quality, Wilson lower bound, Jenks natural breaks, tier assignment, window trend). New `src/components/TrendIndicator.tsx` (arrow-only ▲/▼/– chip ported from the design system's `ChangeIndicator`, number suppressed, localized aria-label). Modified: `src/lib/metagame.ts` (attach a stable 2-week `tier` and a selected-window `trend` to each `ArchetypeShare`), `src/lib/tiers.ts` (retire share-based `tierFor`; keep the `Tier` type), `src/hooks/useMetagame.ts` (fetch the 2-week corpus once, derive the selected window by client-side date filter, compute the 2-week tier + selected-window trend), `src/components/ArchetypeCard.tsx` (pass the explicit `tier` to `TierBadge` and render the `trend` arrow), `src/App.tsx` (thread the new fields through), and `src/locales/{en,es}.json` (trend aria-labels only).
- **No change** to: Supabase schema, the scraper/pipeline, dependencies, the metagame-share display, or any existing i18n string (only new trend labels are added).
- Tests: new `src/lib/powerScore.test.ts`, `src/components/TrendIndicator.test.tsx`; updates to `metagame.test.ts`, `tiers.test.ts`, `ArchetypeCard.test.tsx`, `useMetagame.test.tsx`.
- **Known limitations (documented):** grid membership is still popularity-gated (top-20 by share) and event size/strength is not factored in (no reliable field size), so Power Score ranks performance *within the displayed field*; and the 5-day trend can be based on a small subset (it is a secondary hint, while the badge stays robust on the 2-week corpus). Surfacing sub-top-20 dominant decks or weighting by field size is future work.
