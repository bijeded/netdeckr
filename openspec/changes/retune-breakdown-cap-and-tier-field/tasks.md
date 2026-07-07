# Tasks

Disciplined mode: one task group per branch → TDD → code-review subagent → PR → human merge. Groups are ordered so each intermediate `main` state is safe.

## 1. Decouple the display cap from the tier reference field (lib)

- [x] 1.1 Add failing tests: `deriveBreakdown` returns the full ranked list when no cap is passed, and slices when a cap is passed; ranking/tiebreak unchanged.
- [x] 1.2 Replace `TOP_N = 20` with `GRID_DISPLAY_CAP = 12`; make `deriveBreakdown` uncapped by default with an optional cap param (display slicing moves to the caller).
- [x] 1.3 Add failing tests: `attachPowerTiers` attaches a tier to **every** archetype in the passed breakdown (not just a top slice) using the whole-corpus reference field.
- [x] 1.4 Update `attachPowerTiers`/callers so the reference field is the full 2-week corpus; keep tier assignment/trend behavior otherwise identical.
- [x] 1.5 Run `npm run test`, `npm run type-check`, `npm run lint`; code-review subagent; PR.

## 2. Expose the full tiered breakdown + uncapped names from the hook

- [x] 2.1 Add failing `useMetagame` tests: `breakdown` contains every archetype in the corpus, each with a tier; existing top consumers still work.
- [x] 2.2 Update `useMetagame` so `twoWeekTopNames` → full 2-week corpus names and `attachPowerTiers` runs over the full `deriveBreakdown` output (uncapped `breakdown`).
- [x] 2.3 Confirm `totals.archetypes` (distinct count) and `fullDecksByArchetype` are unaffected; add/adjust tests as needed.
- [x] 2.4 Run test/type-check/lint; code-review subagent; PR.

## 3. Top-12 default grid + popularity caption (App + i18n)

- [x] 3.1 Add failing tests: default view renders at most 12 cards; caption "Top N most popular archetypes" reflects the shown count and sits above the freshness line; caption hidden under a tier filter.
- [x] 3.2 Add `dashboard.topCaption` (count-aware) keys to `en`/`es` locales; render the caption in `App.tsx`; slice the default grid to `GRID_DISPLAY_CAP`.
- [x] 3.3 Confirm the StatCard `Archetypes` total still shows the true distinct count (> 12 when applicable); adjust/add test.
- [x] 3.4 Locale-parity test passes; run test/type-check/lint; code-review subagent; PR.

## 4. Uncapped Archetype filter dropdown

- [x] 4.1 Add failing test: the Archetype dropdown lists every archetype in the corpus (or every archetype within the selected event), including those below the top-12 grid.
- [x] 4.2 Confirm `ArchetypeSelector` options come from the full `breakdown` names (now uncapped); adjust `App.tsx` wiring if needed.
- [x] 4.3 Verify selecting a below-cap archetype isolates + auto-expands it with all its decks.
- [x] 4.4 Run test/type-check/lint; code-review subagent; PR.

## 5. Tier filter (TierSelector + App wiring + i18n)

- [ ] 5.1 Add failing `TierSelector` tests (mirror `ArchetypeSelector`): options All/Tier 1/Tier 2/Tier 3/Rogue-Otros, localized heading/default/Rogue-Otros label, onChange emits the tier or null.
- [ ] 5.2 Create `src/components/TierSelector.tsx`; add `filters.tier.*` keys to `en`/`es`; place the selector after the Archetype filter in the sidebar.
- [ ] 5.3 Add failing `App` tests: selecting a tier shows all that tier's archetypes as **collapsible** cards (uncapped, not auto-expanded), hides the popularity caption, and ANDs with the event filter (shares within the event).
- [ ] 5.4 Wire `tier` state and the tier-filtered visible grid (`breakdown.filter(a => a.tier === tier)`); empty state when a tier matches nothing under the combined filters.
- [ ] 5.5 Add failing tests for precedence/auto-reset: choosing an archetype outside the selected tier resets the tier to All; a format/window/event change that leaves the tier empty resets it; "Clear filters" resets event/archetype/tier and restores the default caption view.
- [ ] 5.6 Implement the precedence + auto-reset effects and extend `ClearFiltersButton` wiring to include the tier.
- [ ] 5.7 Locale-parity test; run test/type-check/lint; code-review subagent; PR.

## 6. Live verification & closeout

- [ ] 6.1 Verify tier distribution against live Supabase across all five formats (read-only anon): confirm the whole-corpus Jenks field produces a sensible T1/T2/T3/Otros spread and the Tier filter shows the expected archetypes; note any calibration concerns.
- [ ] 6.2 Manual smoke: default caption/top-12, uncapped archetype dropdown, Tier filter (collapsible cards + empty state), tier+event AND, archetype-wins-over-tier reset, Clear filters.
- [ ] 6.3 `/opsx:sync` deltas into `openspec/specs/`; `/opsx:archive`; update `docs/HANDOFF.md` (chore PR).
