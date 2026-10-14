# Proposal

## Why

The four trending tables have inconsistent layouts (Avg on two, a set chip on one), and none of them says what players usually want first: how many decks run a card, and whether that number is going up. They are called "trending" but show no trend.

## What Changes

- All four tables (Top Creatures, Top Spells, Top Sideboard Cards, Top New Cards) share one column layout: rank · card · **Avg** · **Copies** · **Decks** · **Trend**.
- **Decks** (play rate): the share of legal decks in the active slice that run the card, as a whole-number percentage. For the sideboard table it is the share of all decks in the slice that bring the card in the sideboard; for Top New Cards, in either board.
- **Trend**: the play rate's change, in percentage points, versus the immediately preceding window of equal length (7 days vs the 7 before; 14 vs the 14 before). It uses the archetype share delta's ▲/▼/– indicator, the ±0.5pp flat deadband, and suppression when the preceding slice holds fewer than 3 decks.
- **Avg** (average copies per deck running the card) is added to Top Sideboard Cards and Top New Cards. **BREAKING** (spec): both currently say they SHALL NOT show it.
- **Removed**: the set-code chip and Set column on Top New Cards. **BREAKING** (spec).
- Ranking is unchanged: total copies, then deck count, then name.
- When a table is narrow (always on phones, and in the desktop 2x2 grid at smaller widths), the **Copies** column is hidden so the card name keeps usable width.
- The How It Works page (ES/EN) explains Avg, Copies, Decks and Trend, and drops its sentence about the set code on Top New Cards.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `trending-cards-view`: table columns (uniform layout, Avg on all tables, set chip removed), new play-rate and trend requirements, and the responsive column rule.
- `legal-pages`: How It Works content must explain the trending tables' Avg, Copies, Decks and Trend values, and cover Top New Cards.

## Impact

- **Frontend**: the trending tables component, the trending hook and its pure derivation module, the metagame hook (which supplies the slice deck totals for the play-rate denominator), the share-delta indicator (reused with card-specific labels), the dashboard wiring between them, the How It Works content (ES/EN), and the ES/EN locale files. The tests for each are updated.
- **Data access**: one extra read per trending RPC for the preceding window (`top_cards` main + side, `recent_set_top_cards`), from the browser under the existing read-only RLS. No new RPC.
- **Supabase**: no schema, table, function or RLS change. `recent_set_top_cards` still returns `set_code`; the frontend stops displaying it.
- **Scraper / pipeline**: unaffected.
- **Time windows / retention**: the 7days/2weeks model is unchanged. The preceding 14-day window ends 28 days back, inside the 30-day retention and the dashboard's existing 28-day corpus fetch.
- **User-visible**: yes. Under CLAUDE.md's exception 1, the PR waits for confirmation on the Vercel preview before merging.
