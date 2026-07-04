## 1. Power Score core library (`src/lib/powerScore.ts`)

- [ ] 1.1 TDD `finishQuality(placement)`: champion/finalist/top4/top8/top16/top32/beyond map to decreasing quality; range labels (`"3-4"`) and bare Swiss ranks (`"3"`, `"12"`) bucket by leading number; empty/unparseable → `null`.
- [ ] 1.2 TDD `meanQuality(placements)`: mean of usable qualities; `null` when none are usable.
- [ ] 1.3 TDD `wilsonLowerBound(pHat, n, z?)`: LB ≤ pHat; LB rises toward pHat as n grows for fixed pHat; small n produces large shrink (pHat=1,n=1 well below 1); LB clamped to [0,1]; default `z` constant applied.
- [ ] 1.4 TDD `archetypePowerScore(placements, z?)`: `meanQuality` → Wilson LB ×100; returns `0` when no usable placements; deeper-finish sets don't decrease the score; a many-shallow set scores below a few-deep set.
- [ ] 1.5 TDD `jenksBreaks(values, classes)`: known small example yields the optimal natural breaks; degrades gracefully when `classes` ≥ distinct values; single value → single class; deterministic.
- [ ] 1.6 TDD `assignTiers(scoresByArchetype, referenceScores)`: Jenks over the reference scores, classify each archetype's score into T1..fringe; <4 distinct reference scores map from the top (T1 first, lower tiers absent); no-usable-placement archetype (score 0) lands in the fringe tier; deterministic.
- [ ] 1.7 TDD `windowTrend(selected, baseline, { eps?, minSelected? })`: `'up'` when selected mean quality exceeds baseline beyond `eps`, `'down'` when below beyond `eps`, `'flat'` within the deadband; `'flat'` when the selected set has fewer than `minSelected` usable placements (default 3, covering the zero case) so one/two recent results can't swing it; add the `Trend` type.

## 2. Attach stable 2-week tier + selected-window trend to the breakdown (`src/lib/metagame.ts`, `src/lib/tiers.ts`)

- [ ] 2.1 TDD: `DeckForBreakdown` gains `placement: string`; `ArchetypeShare` gains `tier: Tier` and `trend: Trend | null` (`null` ⇒ no indicator); `deriveBreakdown` keeps share/rank/top-20 unchanged over the **selected** decks.
- [ ] 2.2 TDD: a pure orchestrator takes the 2-week decks + selected decks (grouped by archetype) + whether the selected window is the baseline, computes the 2-week reference breaks (over the 2-week top-20) and per-archetype 2-week Power Scores, attaches the **stable 2-week `tier`**, and attaches `trend = null` when the selected window is the baseline, else the `windowTrend` result.
- [ ] 2.3 TDD: tier is stable across windows (same archetype ⇒ same tier for 5days and 2weeks); `trend` is `null` for every archetype when the selected window is the 2-week baseline, and non-null (up/down/flat) on the 5-day window.
- [ ] 2.4 TDD: share value, one-decimal format, bar inputs, ranking, and the top-20 cap are unchanged by the added fields (regression assertions in `metagame.test.ts`).
- [ ] 2.5 Retire share-based `tierFor(pct)` from `src/lib/tiers.ts` (remove/mark unused), keep the `Tier` type as the shared contract, and update `tiers.test.ts` accordingly.

## 3. Trend indicator component (`src/components/TrendIndicator.tsx`)

- [ ] 3.1 Port `design/components/data/ChangeIndicator.jsx` to React+TS as `TrendIndicator`, driven by a `Trend` value (not a number): renders ▲/▼/– with the up/down/flat semantic colors, **no numeric delta**.
- [ ] 3.2 Add localized aria-labels (`trend.up` / `trend.down` / `trend.flat`) to `src/locales/en.json` and `src/locales/es.json`; TDD `TrendIndicator.test.tsx` asserts glyph, color, accessible label per locale, and that no number is rendered.

## 4. Wire the stable badge + trend through the UI

- [ ] 4.1 `src/hooks/useMetagame.ts`: fetch the 2-week corpus once; build 2-week groups (carrying `placement`) and the selected-window subset via a client-side `event_date >= windowStartISO(selected)` filter; call `deriveBreakdown` + the orchestrator; expose `breakdown` with `tier`/`trend`. Update `useMetagame.test.tsx` so tier + trend flow through and the 5-day breakdown still matches a 5-day fetch.
- [ ] 4.2 `src/components/ArchetypeCard.tsx`: accept `tier: Tier` and `trend: Trend | null` props; pass `tier={tier}` to `TierBadge` (badge no longer uses `pct`); render `<TrendIndicator trend={trend} />` **only when `trend != null`** (no arrow on the 2-week view); share number and bar still use `sharePct`. Update `ArchetypeCard.test.tsx` to assert the badge reflects the passed tier (not share), the arrow renders on the 5-day case, and no arrow renders when `trend` is `null`.
- [ ] 4.3 `src/App.tsx`: pass `share.tier` and `share.trend` into each `ArchetypeCard`; confirm the fringe label stays localized (Rogue/Otros) and the empty/loading/error states are unchanged (`App.test.tsx`).

## 5. Verification & close

- [ ] 5.1 Full frontend suite green: `npm run test`; `npm run type-check`; `npm run lint`.
- [ ] 5.2 Manual sanity check against live data: badges are stable when toggling 5days⇄2weeks; deep-finishing archetypes out-rank popular-but-shallow ones; on Last 5 Days the ▲/▼ arrows point sensibly (and low-recent-count cards read flat), while Last 2 Weeks shows no arrows; no card renders a blank/erroring badge.
