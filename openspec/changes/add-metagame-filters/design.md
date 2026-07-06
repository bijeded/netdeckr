## Context

The metagame view is driven by `useMetagame(format, window)`, which fetches the **2-week deck corpus** for a format in one Supabase query and derives, client-side: the ranked breakdown (share), the per-archetype display decks, and Power tiers/trends. The selected time window is already a client-side date subset of that corpus. `App.tsx` renders the sidebar with `WindowSelector`; the grid + freshness read the hook's output.

This change adds two more client-side filters (event, archetype) over the same corpus. The `events`/`decks` tables already carry everything needed — each deck row already joins its `events(name, event_date)`. No new fetch, schema, or scraper work. The main design question is *where* filter state and application live so the breakdown, decks, tiers, and the event/archetype option lists all stay consistent.

## Goals / Non-Goals

**Goals:**
- Event (single-select) and Archetype (single-select) filters in the existing sidebar, combining (AND) with the time-frame over the active format.
- Filter application re-derives the breakdown from the filtered deck subset with no extra fetch.
- Option lists (which events/archetypes exist) reflect the currently filtered view; invalid selections auto-reset to "All".
- Per-group "All" defaults + a global "Clear filters" control; in-memory only (no URL).
- ES/EN localized; responsive within the current sidebar/drawer.

**Non-Goals:**
- No URL persistence of event/archetype (events churn out of the 30-day window).
- No multi-select, no event search/typeahead, no schema/scraper change.
- Power Score tier semantics are unchanged in definition — but see Decisions for what field they classify against once filtered.

## Decisions

**1. Filter state lives in `App.tsx`; the event filter is applied inside `useMetagame`, the archetype filter is display-only.**
Add an `eventId` param (nullable = "All") to `useMetagame(format, window, { eventId })`. The hook keeps its single 2-week fetch and applies the event predicate alongside the existing window date filter before deriving the breakdown, so each archetype's percentage becomes its **share within the selected event**. The **archetype filter is deliberately NOT applied to the breakdown derivation** — doing so would collapse the isolated archetype's percentage to 100% and destroy the event-share meaning when both filters are active. Instead the archetype filter is a pure display filter in `App.tsx`: it selects which card(s) to render (keeping the correct event-scoped percentage) and swaps in the full deck list for the isolated card. Alternative — a separate selector hook wrapping the raw decks — was rejected because the tier/trend derivation is already entangled inside `useMetagame`.

**2. The hook returns the option lists for the two filters.**
`useMetagame` additionally returns `events` (distinct `{ id, name, eventDate }` present in the *window-filtered* corpus, date-desc). The archetype option list is simply the returned `breakdown` names (which already reflect the event filter). This ensures the dropdowns only offer valid choices and drives auto-reset. The query must now also select `events.id` (currently only name/date/format_code are selected). The hook also returns `fullDecksByArchetype` (uncapped, date-desc) so the isolated, auto-expanded card can list every deck.

**3. Auto-reset is computed in `App.tsx` via an effect.**
When the returned `events`/`archetypes` option lists no longer contain the current selection, `App` clears that selection to `null`. Because the hook derives from `null` when a selection is absent, the fallback render is already correct for the frame; the effect corrects the state right after. Alternative — resetting inside the hook — was rejected to keep the hook a pure function of its inputs.

**4. Tier reference field stays the unfiltered 2-week top-20.**
Per the handoff, the tier badge is deliberately *stable* (2-week-anchored). Event/archetype filtering is a **view** filter, not a re-scoping of competitive strength, so tiers/trends continue to be computed from the full 2-week corpus and merely displayed on whichever archetypes survive the filter. This avoids a single-event Power Score (tiny sample, meaningless) redefining tiers.

**5. A selected archetype auto-expands and shows all its decks.**
The unfiltered grid caps per-archetype display decks (via `selectDisplayDecks`, currently 6). When the Archetype filter isolates one archetype, that cap is lifted for that archetype: the hook (or the App-level render) supplies the archetype's **complete** deck list under the combined filters, and `App`/the card renders in the expanded state by default. Decks are ordered most-recent-first by event date (the query already orders `events.event_date` desc). Decision: expose the full decks for the selected archetype rather than raising the global cap, so the unfiltered grid's card sizing is untouched. The auto-expanded state reuses the existing expanded-card + decklist UI.

**6. New components mirror `WindowSelector`.**
`EventSelector` and `ArchetypeSelector` (select-style groups with an "All …" default) + a `ClearFiltersButton`, all in `src/components/`, mounted in `.sidebar-inner` beside `WindowSelector`. New `filters.*` i18n keys. Event/archetype proper nouns render verbatim (English) in both locales; only headings/defaults/clear-button are translated.

## Risks / Trade-offs

- **Long event lists** in a busy 2-week window (dozens of events) → a plain native `<select>` scales fine and needs no new dependency; typeahead is deferred.
- **Auto-reset flicker** (one frame showing unfiltered before the effect clears a stale selection) → acceptable and invisible in practice; the derived output for that frame is already the correct "All" view.
- **Filtered-out selected archetype** must still show a localized empty state (distinct from auto-reset, which only fires when the option truly disappears from the corpus). The archetype filter's empty state fires when the archetype exists in the corpus but has no decks under the combined filters — handled in the grid render, not by reset.

## Migration Plan

Pure additive frontend change, single PR. No schema/scraper deploy, no data migration. Rollback = revert the PR.

## Open Questions

None — all behavior was resolved in the user-stories session.
