# Proposal

## Why

The archetype Analysis tab shipped without any explanation on the How It Works page. Its explanatory text was removed from the tab during preview review and left for this page. Players now see labels like Power Score, Core / Flex / Spicy, and an Arena wildcard count with nothing defining them, and they may not realize the tab ignores the sidebar filters. Two tests from the same change were also left unwritten, and a CSS comment still says a confirmed colour is pending review.

## What Changes

- The How It Works page (EN and ES) gains an "Analysis tab" section after the dashboard explanations: a short intro stating the tab's fixed scope (last 2 weeks, all events, sidebar filters ignored), then one bullet per part of the tab: the stock list, Power Score, the performance figures, consensus bands, the sideboard plan, card types, Arena wildcards, and the small-sample label.
- New test: the consensus table and sideboard plan return to page 1 when the archetype changes.
- New assertion: the "Analysis →" control keeps its own accent class, distinct from "View all lists →".
- The comment on the "Analysis →" accent in the dashboard stylesheet is updated to say it was confirmed on the PR #220 preview.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `legal-pages`: adds a requirement that the How It Works page explains the Analysis tab.

## Impact

- How It Works content modules (EN and ES) and their tests.
- Archetype analysis and app tests; one stylesheet comment. No runtime behavior change outside the How It Works page.
- No Supabase, RLS, scraper, time-window, or retention change.
- User-visible: the PR waits for confirmation on the Vercel preview before merge.
