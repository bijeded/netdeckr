# Design

## Context

The isolated archetype view already exists. `archetypeName` state in `App.tsx` drives it: the grid narrows to one card, `fullDecksByArchetype` supplies the uncapped deck list, `totalsFromDecks` recomputes the stat strip, and `trendingArchetypeNames` narrows the trending tables. The only way in is `selectArchetype()`, which the sidebar dropdown calls; it also resolves the archetype/tier conflict.

URL state follows one pattern across three hooks: `useFormatSelection` (`?f=`) and `useWindowSelection` (`?w=`) use `replaceState`, and `useLegalPage` (`?page=`) uses `pushState`. Each re-reads its param on `popstate`. Filter state is deliberately in-memory today.

Two existing effects in `App.tsx` would destroy an `?a=` deep link:

1. **Format-reset effect** (`useEffect(..., [format])`). It runs on mount as well as on format change, so it nulls `archetypeName` on the first render.
2. **Archetype auto-reset effect** (`breakdown.some(...)`). `breakdown` is `[]` while `useMetagame` is loading, so any archetype read from the URL is cleared before data arrives.

## Goals / Non-Goals

**Goals:**
- The new control reuses `selectArchetype()`. It adds no second code path into the isolated view.
- `?a=` is the single source of truth for `archetypeName`, read on load and on `popstate`, so Back/Forward and reload all agree.

**Non-Goals:**
- No new archetype-specific content (core/flex cards, finish distribution). Those were option C in exploration and are a separate follow-up.
- Event, size, and tier stay in-memory. Moving them to the URL is a separate decision.
- No change to the capped display set itself. The 4→6 fix is spec-only.

## Decisions

### D1. A `useArchetypeSelection` hook owns `?a=`
The new hook mirrors `useFormatSelection`/`useLegalPage`. It reads `?a=` lazily into state, listens to `popstate`, and exposes `setArchetype(name, { push })`. `push: true` calls `pushState`; the default calls `replaceState`. A `null` name deletes the param. `URLSearchParams` handles encoding, so names like `4/5C Control` round-trip without custom escaping.

- *Alternative:* keep `useState` in `App.tsx` and mirror it to the URL in an effect. Rejected because a mirror effect cannot tell a user action (push) from an auto-reset (replace), and a hand-rolled `popstate` handler would drift from the sibling hooks' pattern.
- The hook does not validate names against the breakdown, because it has no data. Validation stays with the auto-reset effect (D3).

### D2. History semantics: push only for "View all lists →"
- **"View all lists →" → `pushState`.** Opening an archetype from a card reads as navigating into it, so Back should return to the grid. This matches `useLegalPage`'s reasoning.
- **Sidebar dropdown, Clear filters / Reset, auto-resets, format switch → `replaceState`.** These are filter adjustments on the same page, consistent with `?f=`/`?w=`. Pushing on every dropdown change would make Back step through filter history.
- `selectArchetype(name, opts)` gains an optional `{ push }` passed through to the hook. The tier-conflict resolution is unchanged, and the link passes `push: true`.

### D3. Make both reset effects deep-link safe
- **Format reset:** run only on an actual format *change*, not on mount. Track the previous format in a ref and skip the first run. On a real change it calls `setArchetype(null)` (replace), which also clears `?a=`.
- **Archetype auto-reset:** gate on `!loading`. While loading, an empty `breakdown` says nothing about validity. Once loaded, an unknown name resets through `setArchetype(null)` (replace), which removes `?a=` from the URL. The same path covers a stale shared link and a window switch that removes the archetype.
- *Alternative:* defer reading `?a=` until the first load completes. Rejected because the dropdown and caption would flash "All archetypes" and then jump, and it splits the source of truth.

### D4. Placement and visibility of the control
- The control sits in the existing `deck-list` header row in `App.tsx`, on the right, after the "N lists" count. It is a `<button>`, not an anchor, because it changes in-app state the same way the window pill does. An `href="?a=..."` anchor would allow open-in-new-tab, but it would reload the whole app outside React's state flow. Recorded as a trade-off.
- It renders only when the card is expanded and `!isolated`. It still renders under an active event filter, because isolation adds the archetype-scoped stat strip and trending tables even when the deck list is already uncapped.
- After `selectArchetype`, the handler scrolls `.app-main`, the actual scroll container, to the top, because the clicked card can sit far down the grid. The scroll uses `behavior: 'smooth'` unless `prefers-reduced-motion` is set.
- Label: new i18n key `decks.viewAll` ("View all lists" / "Ver todas las listas"), with the `→` glyph appended outside the string, matching `decks.viewDeck`. The accessible name adds the archetype through a separate key (`decks.viewAllLabel`: "View all {{archetype}} lists").

### D5. Making it stand out (calculated vs. pending)
The deck rows' "go to deck →" text already uses `--neon-text-soft`, so color alone cannot distinguish the new control. The difference has to come from **shape and weight**: the bordered, tinted pill treatment of the header's window pill (`.window-pill`: `--neon-tint-16` fill, `--neon-border` outline, display font), reused as-is or as a shared class.

- **Calculated:** `--neon-text-soft` (#e8c9ff) on the pill composited over the deck-list panel (≈ rgb(64,35,94)) is **8.79:1**. It clears 4.5:1. `--neon-text` (#c79bff) on the same is 5.91:1.
- **Calculated:** a solid accent fill with white text fails at the light end. White on `--neon-500` is **3.95:1**, below 4.5:1, so a solid gradient pill is ruled out at this text size unless it uses only `--neon-600` (5.81:1).
- **Calculated:** the pill uses no share-delta colors (`#2fe6a0` / `#ff5470` / `#ffcb45`).
- **Pending visual confirmation:** whether the window-pill treatment reads as clearly more prominent than the "go to deck →" links inside a panel that is itself neon-tinted. If it doesn't, the candidate fallback is a stronger border or fill alpha, settled on the Vercel preview and recorded here once confirmed.
- ~~**Pending visual confirmation:** whether the "N lists" count and the pill fit on one header row at ~360px, or the pill should replace the count on narrow widths.~~ **Superseded after preview review:** the first build let the count and pill wrap together under the heading. On a phone that left them in a left-aligned row ("6 lists [View all lists →]"), which the user rejected. Now the heading and count stay paired on row one, and at ≤640px the pill takes its own full-width row beneath them, above the deck rows (`.deck-list-header`; the pill is last in DOM, so it wraps without reordering). The desktop single-row layout is unchanged. The new mobile treatment is pending confirmation on the preview.
- The tap target height is a rule, not a guess: at least 32px tall on touch.

### D6. "← Back" in the isolated view (added after preview review)
The user asked for a Back control in the archetype view that "works like the Reset button".

- **Placement and look:** it sits in the caption row's right-hand group, before Reset, and uses Reset's enabled `.reset-filters` treatment. Both are ways out of a filtered view. It renders only while an archetype is isolated, so it never sits disabled.
- **Effect: it clears the archetype only, not every filter.** "Back" means returning to the grid you came from. If that grid had an event or tier filter, it comes back with it. With no other filter active, the result is identical to Reset. *Alternative:* the same call as Reset (`clearFilters`). Rejected because the two buttons would then be redundant side by side. Flip it if the preview says otherwise.
- **History:** `setArchetype(..., { push: true })` tags its entry with history state `{ archetypeEntry: true }`, and replaces now keep the current entry's state rather than overwriting it with `{}`. `leaveArchetype()` calls `history.back()` on a tagged entry, so the browser's Back never lands on a duplicate grid. On any other entry (shared link, sidebar) it clears `?a=` in place.
- *Known gap:* `useFormatSelection`/`useWindowSelection` still `replaceState({})`. A window toggle inside a pill-entered view therefore drops the tag, and Back then clears in place. That leaves one duplicate grid entry behind, which is harmless.

## Risks / Trade-offs

- [Archetype names are not stable IDs. A rename on MTGTop8 breaks old links.] → The silent reset handles it with no error. Acceptable for a 30-day rolling dataset.
- [`<button>` instead of `<a href>` means no middle-click/open-in-new-tab.] → Accepted for consistency with the in-app state model. The URL is still shareable from the address bar after clicking.
- [The `!loading` gate leaves a stale name selected until data arrives.] → Nothing renders the grid while loading, so the stale name is never visible against wrong data.
- [The scenario titles "Fall back to the latest 4 lists…" and "Filters do not persist across reloads" keep their old wording in the delta. `openspec validate` refuses a MODIFIED block that drops an existing scenario title, and there is no scenario-rename syntax.] → The bodies are corrected in the delta. After sync, those two titles get retitled by hand in the main specs (tracked in tasks).

## Migration Plan

Frontend only, no data migration. Links without `?a=` behave exactly as before. Rollback is a revert. Any `?a=` links already shared would then just be ignored, because unknown params are not read.
