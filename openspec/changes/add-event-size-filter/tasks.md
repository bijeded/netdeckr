## 1. Size classification

- [x] 1.1 Add `src/lib/eventSize.ts`: the band constants (32 / 96 / 256), the size-class union type including the unsized class, and `sizeClassOf(playerCount: number | null)`. Comment the deliberate asymmetry with `powerScore.sizeWeight()` (which treats null as small) so it does not read as a bug. Unit-test the exact boundaries (31/32, 95/96, 255/256) and the null case.

## 2. Corpus filtering

- [x] 2.1 Extend `MetagameFilters` in `useMetagame` with the size class and apply it in the existing per-row derivation pass alongside `passesEvent`, so shares, decks, and StatCard totals all reflect it. No query change and no additional fetch.
- [x] 2.2 Narrow the returned `EventOption[]` by the active size class so the Event filter can only offer reachable events, while leaving the event options themselves independent of the *event* filter as they are today.
- [x] 2.3 Cover with hook tests: shares recompute within the retained decks, unsized events appear only under the unsized class and are present under the default, tiers are unchanged by the size selection, and the event option list is narrowed.

## 3. Sidebar control

- [x] 3.1 Add an `EventSizeSelector` component reusing the existing select styling ("All event sizes" default plus the five classes). It has **no visible heading** — it renders inside the Event group — so it must carry a localized `aria-label` to stay distinguishable from the event select. All labels from react-i18next, no hardcoded strings.
- [x] 3.2 Render it inside `EventSelector`'s group, between the "Event" heading and the event select, keeping the group a single labelled `role="group"` with one heading rather than nesting a second group.
- [x] 3.3 Add the ES/EN locale entries for the default, the five class labels, and the accessible name.

## 4. Filter state and conflict resolution

- [x] 4.1 Wire the size state into `App.tsx`: pass it to `useMetagame`, thread it through to the Event group's size select, and include it in `filtersActive` and in both the sidebar "Clear filters" and main-window "Reset" handlers.
- [x] 4.2 Implement most-recent-wins in the size selection handler — selecting a size class that excludes the currently selected event clears the event and applies the size — matching how archetype/tier precedence is done. Ensure the existing event auto-reset effect does not also claim this reset; the handler is authoritative.
- [x] 4.3 Test the conflict path end to end: the event clears exactly once, the size applies, and Reset is enabled when a size class is the only active filter.

## 5. Trending

- [x] 5.1 **(SQL)** Extend the `top_cards` RPC in `supabase/schema.sql` with an additive `p_event_ids bigint[] default null` parameter that narrows to a set of events, keeping the existing `p_event_id` intact. The signature changes, so drop and recreate the function and re-grant execute to `anon, authenticated`, following the pattern the file already uses. Authorized as an explicit migration.
- [x] 5.2 **(TypeScript)** Pass the size-narrowed event ids through `useTrendingCards` to the RPC, and thread them from `App.tsx`. The band thresholds stay in `eventSize.ts` — SQL only receives ids.
- [x] 5.3 Test that trending recomputes within the size slice and that an unfiltered view still sends no event-id restriction.

## 6. Verification

- [x] 6.1 Run `npm run lint`, `npm run type-check`, and `npm run test` green. (No scraper work in this change — `player_count` is already populated, though the `top_cards` RPC change in 5.1 must be applied to the database before merge.)
- [x] 6.2 Ship to the Vercel preview and confirm the deferred visual decisions from design.md, then record the outcomes there. This is a user-visible change: do not merge before this confirmation.

## 7. Preview follow-ups

- [x] 7.1 Widen the gap between the two selects in the Event group to `--sp-3` (confirmed on the preview).
- [x] 7.2 Uncap the grid when a size class is active, matching the Event filter's uncapped behavior.
- [x] 7.3 Name the active size class in the grid caption with the short labels (Small / Mid / Large / Massive / Unknown), composing with the archetype, tier, and event captions the way the event name already does. Add the ES/EN entries; these are shorter than the sidebar control's own labels.
- [ ] 7.4 Confirm the three follow-ups on the refreshed preview.
