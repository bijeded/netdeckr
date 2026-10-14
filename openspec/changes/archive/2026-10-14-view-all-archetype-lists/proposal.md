# Proposal

## Why

An expanded archetype card shows only its 6 most recent top finishes, but the full view of that archetype already exists: isolating it through the sidebar Archetype filter lists every deck and scopes the stat strip and trending tables to it. Nothing on the card leads there, so you only find it if you already know the dropdown exists. The isolated view also can't be linked, because filter state is in-memory only. Separately, the `archetype-decklists-view` spec says the expanded card shows "up to 4" decks while the app has shown 6 since an earlier change, so the spec no longer describes the product.

## What Changes

- Add a localized "View all lists →" control to the RECENT DECKLISTS header of an expanded archetype card. It opens the existing isolated archetype view for that archetype, the same state the sidebar Archetype filter produces. It is styled to stand out from the muted "go to deck →" row links, and is not shown on a card that is already isolated.
- Persist the isolated archetype in the URL as `?a=<archetype name>`, next to the existing `?f=` and `?w=`. Loading a URL with a valid `?a=` opens the isolated view. Entering through the new control adds a browser history entry, so Back returns to the grid. An `?a=` that names no archetype in the loaded view resets silently and is removed from the URL, matching the existing auto-reset policy.
- Narrow the rule that "filter selections are in-memory only and not persisted in the URL": the archetype becomes the one URL-backed filter. Event, size, and tier stay in-memory.
- Correct the expanded-card display count in the `archetype-decklists-view` spec from 4 to 6, matching the shipped behavior. This only updates the spec; the behavior does not change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-decklists-view`: "Expand an archetype to its recent decklists" changes its count from 4 to 6 and gains the "View all lists" entry point into the isolated view.
- `metagame-breakdown-view`: "Archetype filter" gains `?a=` URL persistence, deep-link loading, and history behavior. "Clearing filters" changes so the archetype is exempt from the in-memory-only rule.

## Impact

- **Frontend only.** Affects the dashboard shell (filter state and its reset effects), the expanded archetype card's deck-list header, a new URL-selection hook alongside the format/window/legal-page hooks, and the ES/EN locale files.
- **Shareable URLs gain a param.** Links that include `?a=` are new. Existing links without it behave exactly as before.
- **No data-layer impact.** No Supabase tables, RLS policies, RPCs, or scraper behavior change. The time-window model (`7days`/`2weeks`) and the 30-day retention window are unchanged.
- **User-visible.** This falls under merge exception 1, so it needs Vercel preview confirmation before it merges.
