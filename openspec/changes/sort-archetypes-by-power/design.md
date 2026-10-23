# Design

## Context

- `useMetagame` already returns the **whole** selected-window breakdown, tiered: `attachPowerTiers(deriveBreakdown(selectedForBreakdown), …)` runs over every archetype, not the displayed 12. The display cap is applied later in `App.tsx` (`visibleBreakdown`), along with the archetype, tier, and event/size branches.
- `attachPowerTiers` computes each archetype's Last-2-Weeks Power Score internally (`scoreCache`) but returns only `tier` and `trend`. The score is not carried on `ArchetypeShare`.
- `rank` is assigned by `deriveBreakdown` in share order, and `App.tsx` uses it as the card's React `key`.
- URL-backed view state follows one pattern: `useWindowSelection` / `useFormatSelection` read a param on mount, follow `popstate`, and write with `replaceState`. `useArchetypeSelection` handles `tab` the same way, with silent removal of invalid values.
- The caption row is a two-cell flex row: caption + freshness on the left, the always-rendered `reset-filters` button on the right.

Requirements are in `specs/metagame-breakdown-view/spec.md` and `specs/legal-pages/spec.md`.

## Goals / Non-Goals

**Goals:**
- Keep ordering a pure, unit-testable selector over data the hook already loads. No new query, no new request on toggle.
- One source for the score behind both the tier badge and the Power order, so they cannot disagree.

**Non-Goals:**
- Any change to the Power Score formula, the size weighting, the Jenks cutoffs, or the Tier 1 floor.
- Sorting the trending tables, the deck lists inside a card, or the Analysis tab.
- Additional sort keys (wins, trend, share delta).

## Decisions

### 1. Carry the score on `ArchetypeShare`, never render it
`attachPowerTiers` adds `powerScore: number` to each entry it returns, taken from the `scoreCache` it already fills. `ArchetypeCard` does not receive it.

- *Alternative:* recompute the score in `App.tsx` from the placements. Rejected: it duplicates the scoring inputs (`twoWeekPlacements`, sizes, unranked flags) outside the hook and opens a path for the badge and the order to drift apart.
- *Alternative:* sort inside `useMetagame`. Rejected: the hook's output also feeds the archetype filter options and the StatCards, which must stay in share order. Ordering is a display concern, next to the cap.

### 2. A pure `orderBreakdown(list, order)` selector in `src/lib/metagame.ts`
It returns a new array. `popular` keeps share order. `power` sorts by tier index (`T1` < `T2` < `T3` < `Otros`), then `powerScore` desc, then `sharePct` desc, then `name` asc. In both cases it renumbers `rank` 1..N in the resulting order.

`App.tsx` applies it to `breakdown` **before** the existing branches, so every branch (tier filter, event/size context, default cap, isolation) works on the ordered list unchanged. The default branch's `slice(0, GRID_DISPLAY_CAP)` then selects the top 12 *by the active order*, which is what lets a low-share archetype into the Power view (spec: "Power order cap and caption").

- Sorting by tier first, not by raw score: the T1 minimum-deck floor demotes some high scorers to T2. A raw-score sort would put a T2 badge above T1 badges.
- `maxPct` (the share-bar scale) keeps reading the highest share in the breakdown, not `ordered[0]`. Under Power the first card is not the most popular, so reading `[0]` would rescale every bar.

### 3. Card key becomes the archetype name
The `key={archetype.rank}` in `App.tsx` changes to `key={archetype.name}`. With rank renumbered per order, a rank key would remount every card on a toggle and drop the expanded-card state. Names are unique within a breakdown, since `deriveBreakdown` groups by name.

### 4. `useSortOrder` hook, modeled on `useWindowSelection`
A new hook in `src/hooks/useSortOrder.ts` backs `sort` in the URL: `power` → `sort=power`, `popular` → param deleted. Unknown values are removed silently on read. Writes use `replaceState`, and the hook follows `popstate`. It preserves every other param, as the window hook does. A small `normalizeSortOrder` sits in `src/lib/sortOrder.ts`, like `normalizeWindow`.

The format and window setters already preserve unrelated params, so the order surviving a format/window switch needs no extra code. `clearFilters` does not touch it.

### 5. Control: a two-option segmented control, `role="group"` with `aria-pressed`
A new `SortOrderToggle.tsx` renders two buttons, Popular and Power, inside `role="group"` with a localized `aria-label`. The active one has `aria-pressed="true"`.

- *Alternative:* reuse `ArchetypeTabToggle`'s `role="tablist"`. Rejected: tabs imply switching panels. This reorders the same panel.
- *Alternative:* a single toggle pill like the time-window pill (names the current state, glyph names the move). Rejected for now: Popular / Power aren't a natural pair the way 7 days → 2 weeks widens, so both labels should be visible. **Pending visual confirmation** on the preview. If the segmented control crowds the caption row on mobile, the single-pill form is the fallback.
- Disabled while isolated: rendered, `disabled` on both buttons, so the row does not reflow (same rationale as the always-rendered Reset).

Placement: the caption row's right cell becomes a flex group, `[SortOrderToggle] [Reset]`. **Pending visual confirmation:**
- the gap between the two controls;
- whether the toggle reuses the `.tab-toggle` treatment or needs a smaller variant to sit at Reset's height;
- the wrapping behavior at ~375px.

Do not set these values up front; record them here once confirmed on the preview.

**Mobile layout, decided on the preview.** The plan was the same side-by-side arrangement at every width, which is how Reset alone had always sat. It was overturned on the first preview: at ~375px the sort control and Reset beside the caption squeezed "Top 12 most popular archetypes" into a three-line column. At ≤ 640px the controls now drop to their own full-width row below the caption, with the sort control on the left and Reset still right-aligned. Both stay inside the caption row container, so they remain visible without opening the sidebar. Desktop is unchanged. The segmented control stays: the problem was the row's arrangement, not the control's form, so the single-pill fallback is not needed. The gap and the toggle's height are still pending confirmation.

### 6. Captions
New i18n keys `dashboard.powerCaption` ("Top {{count}} by performance" / ES equivalent) and the control's labels. The caption selection in `App.tsx` changes only in its final fallback (`popularity` → `power` caption by order). Tier, event, and size captions are untouched, per spec.

### 7. How It Works copy
One added sentence in the Tier area of `howItWorks.en.ts` / `howItWorks.es.ts`, plus the matching test assertion.

## Risks / Trade-offs

- [Share bars stop decreasing under Power. *Calculated:* the bar is share-scaled and the order is not share-ordered. Whether that reads as intended or as broken is **pending visual confirmation**.] → If it reads as broken, consider muting the bar under Power. That would be a spec change, decided on the preview.
- [Strict rank order implies precision the tiers smooth over. *Calculated:* within a tier, adjacent scores can differ by under 1 point, and the score is never shown.] → Tier-first ordering bounds the effect to within-tier position. The calibration constants are unchanged.
- [Fringe-tier archetypes with no usable placements all score 0.] → The share-then-name tiebreak makes their order deterministic. They sort last and rarely reach the 12-card cut.
- [Caption-row crowding on narrow viewports. *Seen on the preview:* the caption wrapped to three lines.] → The controls get their own row at ≤ 640px (Decision 5). The single-pill fallback was not needed.
- [`powerScore` on `ArchetypeShare` could later be rendered by accident.] → `ArchetypeCard` props do not include it. A test asserts that no score number appears on the grid under Power.

## Migration Plan

Frontend-only, no data or schema change. Rollback is reverting the PR. Old links without `sort` keep the current behavior. A `sort=power` link opened after a rollback is ignored, because no code reads the param.
