## 1. Filter logic in the metagame hook

- [ ] 1.1 Extend the `useMetagame` deck query to also select `events.id`, and thread an `eventId` (nullable = "All") filter param into the hook signature. (The archetype filter is display-only — applied in App, task group 3 — so it does not distort the event-share %.)
- [ ] 1.2 Apply the event predicate alongside the existing window date filter before deriving the breakdown/decks, so each archetype's share is recomputed within the event; tiers/trends stay computed from the full 2-week corpus (unchanged reference field).
- [ ] 1.3 Return `events` from the hook: distinct `{ id, name, eventDate }` present in the window-filtered corpus, date-desc. (Archetype options are the returned `breakdown` names.)
- [ ] 1.4 Return `fullDecksByArchetype` (uncapped, date-desc) so the isolated, auto-expanded card can list every deck of the selected archetype.
- [ ] 1.5 Write/extend `useMetagame` tests: event filter narrows the derived breakdown and recomputes each archetype's share within the event (shares sum to 100% over the event); `events` option list reflects the window corpus; `fullDecksByArchetype` returns all of an archetype's decks date-desc (cap lifted); event filter ANDs with the window; tiers remain 2-week-anchored under filtering.

## 2. Sidebar filter components

- [ ] 2.1 Build `EventSelector` (select group headed "Event" with an "All events" default; options labelled name + abbreviated date), mirroring `WindowSelector` styling/tokens.
- [ ] 2.2 Build `ArchetypeSelector` (select group headed "Archetype" with an "All archetypes" default; archetype names verbatim/English).
- [ ] 2.3 Build `ClearFiltersButton` that resets event + archetype at once (localized label).
- [ ] 2.4 Component tests for each: default entry present, onChange fires with the selected id/name, "All" clears, labels localized.

## 3. Wire filters into the dashboard

- [ ] 3.1 Add `eventId` + `archetypeName` state in `App.tsx`; pass to `useMetagame`; mount the three new controls in `.sidebar-inner` beside `WindowSelector`.
- [ ] 3.2 Add an effect that auto-resets event/archetype to `null` when the hook's returned option lists no longer contain the current selection (on format/window/other-filter change).
- [ ] 3.3 When an archetype is selected, auto-expand its card and show **all** its decks under the combined filters (lift the display cap for that archetype), ordered most-recent-first by event date.
- [ ] 3.4 Render a localized empty state when a selected archetype has no decks under the combined filters (distinct from auto-reset).
- [ ] 3.5 Ensure filters are in-memory only (no URL param) and reset to defaults on reload.

## 4. Localization & responsive

- [ ] 4.1 Add `filters.*` keys (Event, All events, Archetype, All archetypes, Clear filters, empty-state text) to `src/locales/es` and `en`; no hardcoded strings.
- [ ] 4.2 Verify the new groups render and are usable inside the collapsible sidebar/drawer at narrow widths.

## 5. Verify

- [ ] 5.1 Run `npm run test`, `npm run type-check`, `npm run lint` — all green.
- [ ] 5.2 Manual read-only check against live Supabase across formats: event filter narrows correctly, archetype filter isolates, clear + auto-reset behave, ES/EN both correct.
