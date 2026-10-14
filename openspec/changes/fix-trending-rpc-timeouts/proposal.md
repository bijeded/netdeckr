# Proposal

## Why

The trending tables go blank on the largest slices: Top New Cards is empty in Modern (7 days) and Pauper (2 weeks), and every table is empty in Modern (2 weeks). These are not real "no data" results. The trending aggregations exceed the browser role's 3 s statement timeout (reproduced: `57014 canceling statement due to statement timeout`). The UI then renders each failure as the table's "no cards" empty state, so the outage looks like missing data and nobody is alerted.

The slowness comes from the whole-deck legality check added by `exclude-banned-decks`: with no index on `deck_cards.scryfall_name`, every call scans the entire `deck_cards` table (all formats, all dates) to find banned lines. In the Modern 2-week `top_cards` query that scan was 2.2 s of 2.3 s. A rolled-back test with the index cut the same query to 139 ms. The third concurrent call added by the Top New Cards change pushed the slowest call over the limit.

## What Changes

- Add an index on `deck_cards (scryfall_name, deck_id)` so banned-line and recent-set lookups start from the small name sets instead of scanning the table. This speeds up `top_cards`, `recent_set_top_cards` and `illegal_deck_ids` without changing their SQL, signatures or results.
- Make a failed trending load visible. When the trending data fails to load, the affected tables show a localized error message instead of the "no cards yet" empty state. A Top New Cards failure still affects only that table.
- Report trending load failures to Sentry, so a regression like this one raises an alert.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trending-cards-view`: a trending load failure is shown as a localized error state, distinct from the empty state, and is reported to error tracking. "Top New Cards fails independently" changes from "shows its empty state" to "shows its error state".

## Impact

- **Supabase**: `supabase/schema.sql` gains one index on `public.deck_cards`. This is the explicit migration task required by the project rules. It must be applied by hand in the Supabase SQL editor (no migration tool). Building it briefly blocks writes to `deck_cards`, so it has to run outside a scraper run. No table, column, RLS policy or RPC changes. The scraper's writes pay a small extra index-maintenance cost.
- **Frontend**: the trending section of the dashboard (hook state already carries the errors; the page starts rendering them), ES/EN locale files, Sentry reporting.
- **Unchanged**: the `7days`/`2weeks` window model, the 30-day retention window, scraper behavior, and the results of every aggregation.
