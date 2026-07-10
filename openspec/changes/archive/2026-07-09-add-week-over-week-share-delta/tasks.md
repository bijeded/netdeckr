## 1. Pure share-delta selector

- [x] 1.1 Add calibration constants (`DELTA_EPS` pp deadband, `MIN_PREV_DECKS` guard) near the existing constants and a pure helper that, given the window corpus decks + the selected `WindowCode` + `now`, computes per-archetype share for the selected slice `[now−N, now]` and the preceding slice `[now−2N, now−N]` and returns a signed pp delta with `{ direction: 'up'|'down'|'flat', value }` (write the tests first).
- [x] 1.2 Cover in tests: rising → up + positive, falling → down + negative, within-deadband → flat, absent-in-preceding-but-present-now (preceding field populated) → up with full current share, and preceding field below `MIN_PREV_DECKS` → suppressed (indicator omitted).
- [x] 1.3 Verify share is computed **within each window** (count / that window's total), so the delta is a field-proportion change, and confirm it is independent of the display-only archetype filter and not event-scoped.

## 2. Widen the fetch and expose the delta from the hook

- [x] 2.1 In `useMetagame`, widen the deck query `gte` from `windowStartISO('2weeks')` (14d) to the 28-day preceding extent (2× the 2-week window), keeping the same single query and decks-only columns (test the boundary date math).
- [x] 2.2 Compute the per-archetype share delta via the §1 selector over the (event-unfiltered) window corpus and attach it to each `breakdown` entry (e.g. `shareDelta`), leaving existing `share`, tiers, and the performance trend untouched.
- [x] 2.3 Assert in tests that existing shares, tiers, totals, and the performance `TrendIndicator` values are unchanged by the wider fetch.

## 3. ShareDelta indicator component + card placement

- [x] 3.1 Port the design `ChangeIndicator` (arrow **+ number**) as a `ShareDelta` component in `src/components/`, taking `{ direction, value }` + a localized aria-label, rendering nothing when the delta is suppressed (write component tests first).
- [x] 3.2 Render `ShareDelta` in `ArchetypeCard`'s stat footer, **right-aligned opposite the share %**, distinct from the top-right performance trend arrow; keep both legible over the card surface.
- [x] 3.3 Test both windows show the share delta (including the 2-week baseline where the performance arrow is absent), and that the two indicators coexist on the 5-day view.

## 4. Localization

- [x] 4.1 Add `shareDelta.*` aria-label keys (ES/EN) describing the direction + pp change (numeric value + archetype name formatted consistently across locales); keep MTG proper nouns English in both.
- [x] 4.2 Extend the locale-parity test to cover the new keys.

## 5. Verification

- [x] 5.1 `npm run lint`, `npm run type-check`, `npm run test` all green.
- [x] 5.2 Live read-only verification against Supabase across all five formats: a known riser shows ▲ +value, a faller ▼ −value, the 2-week view shows the delta, and a format/archetype with a thin preceding slice suppresses the indicator; tune `DELTA_EPS`/`MIN_PREV_DECKS` if needed. Verified (2026-07-09): risers/fallers sensible across ST/PI/MO/PAU/PREM (e.g. ST Izzet Prowess ▲+4.4, Red Deck Wins ▼-5.4; PI UR Aggro ▲+7.2); new-this-period archetypes read as genuine rises (0.0→x); deadband keeps small-field noise flat; preceding slices all ≫ 3 decks so field-level suppression stays a safety net (unit-tested). Constants kept (0.5 / 3).
