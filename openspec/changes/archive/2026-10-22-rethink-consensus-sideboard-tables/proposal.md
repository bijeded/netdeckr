# Proposal

## Why

User feedback says the Analysis tab's Consensus and Sideboard Plan tables add nothing they don't already get from the trending tables further down the dashboard (Top Creatures, Top Spells, Top Sideboard Cards). With the archetype isolated, those tables already rank the archetype's mainboard and sideboard cards by play rate and average copies. The two Analysis tables repeat that information in a longer, paged form and push the rest of the tab down.

## What Changes

- **BREAKING** (UI): Remove the Consensus table from the Analysis tab.
- **BREAKING** (UI): Remove the Sideboard Plan table from the Analysis tab.
- Remove the core / flex / spicy inclusion bands. The Consensus table is the only place they appear.
- Remove the 10-row paging those two tables use.
- The Analysis tab keeps the stock list, composition rail (curve, card types, wildcards), and performance section. The small-sample label now covers only the sections that remain.
- The How It Works page no longer explains the consensus bands or the sideboard plan.
- No change to how the stock list is ranked or built. Removing the tables does not touch the finish-weighted inclusion ranking behind it.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-analysis`: remove the "Consensus card table", "Sideboard plan", and "Card tables are paged" requirements. Edit "Small-sample label" and "Localized analysis UI" so they stop mentioning those tables and the bands.
- `legal-pages`: edit "How It Works explains the Analysis tab" so the section no longer has entries for the consensus bands or the sideboard plan.

## Impact

- **Frontend:** the Analysis tab (`ArchetypeAnalysis`), the `ConsensusTable` component, the consensus and sideboard-plan rows and band output in `src/lib/stockList.ts`, the table, band, and pager styles in `dashboard.css`, and the band color tokens in `colors.css` (one of them, `--band-flex`, is also used by the performance funnel bar).
- **Copy:** the `analysis.composition.*` table and band strings in `en.json` / `es.json`, and the Analysis tab entries in the How It Works content (EN/ES) and its tests.
- **Tests:** `ArchetypeAnalysis.test.tsx`, `stockList.test.ts`, `howItWorks.test.ts`.
- **User-visible:** yes. This falls under CLAUDE.md merge exception 1, so it must be confirmed on the Vercel preview before merging.
- **Not affected:** Supabase tables, RLS policies, RPCs, scraper behavior, the 7days/2weeks time-window model, the 30-day retention window, and the trending tables.
