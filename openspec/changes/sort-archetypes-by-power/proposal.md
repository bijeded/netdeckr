# Proposal

## Why

The grid ranks archetypes only by metagame share and shows the top 12. An archetype that performs well but is rarely played (for example, 2% share with a Tier 1 badge) can rank below 12th and never appear unless the user opens the Tier filter. Players looking for the strongest archetypes have no direct way to see them in order, and another table would repeat the grid's content. The Analysis tab's tables were just removed for that reason.

## What Changes

- Add a sort control to the grid's caption row, next to "Reset", with two options: **Popular** (the default, current behavior) and **Power**.
- Under Power, the grid takes every archetype in the current window and filtered view, orders them by tier (T1 first, then T2, T3, fringe), then by Power Score within a tier, then by share, then by name. It then applies the same 12-card cap as the popularity view. A strong but rarely played archetype can now enter the top 12.
- The ordering uses the same Last-2-Weeks Power Score that sets the tier badge, so the order and the badges always agree, whatever window is selected. Only archetypes present in the current window are eligible.
- The Power Score number is never shown on the grid. It stays visible only on the Analysis tab.
- Cards are numbered 1..N in the active order.
- The caption names the active order: the default caption becomes "Top 12 by performance" (localized) under Power. Tier, event, and size-class captions are unchanged.
- The sort combines with filters: within a tier filter it orders that tier, and with an event or size filter it orders the uncapped field. While an archetype is isolated, the control stays rendered but disabled.
- The sort is a view preference, not a filter. "Reset" and "Clear filters" do not change it, and it does not enable "Reset".
- The selected order is persisted in the URL as `?sort=power`. The param is absent for the default, and an invalid value falls back to Popular. A shared link reopens the same order.
- The share bar keeps meaning metagame share, so under Power the bars no longer decrease from card to card.
- The How It Works page explains the Power order in one sentence.
- All new copy is localized in ES and EN.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: add requirements for the grid sort order: the control, the Power ranking rule, the Power cap and caption, the disabled state while an archetype is isolated, URL persistence, and independence from filters. Edit "Display the archetype breakdown" so the 12-card cap, the rank, and the caption are defined per sort order. Edit "Clearing filters" so the scenarios describing what returns after a reset follow the active sort order.
- `legal-pages`: edit "How It Works content" so the page explains the Power sort order.

## Impact

- **Frontend:** the grid caption row and grid ordering in `App.tsx`, the breakdown selectors in `src/lib/metagame.ts` (the Power Score has to be available for ordering without being displayed), URL param handling, the How It Works content (EN/ES), and the `en.json` / `es.json` locale files.
- **Tests:** `App.test.tsx` (ordering, cap, caption, URL, Reset independence), metagame selector tests, and How It Works content tests.
- **User-visible:** yes. This falls under CLAUDE.md merge exception 1 and must be confirmed on the Vercel preview before merging.
- **Not affected:** Supabase tables, RLS policies, RPCs, scraper behavior, the Power Score formula and tier cutoffs, the 7days/2weeks time-window model, and the 30-day retention window.
