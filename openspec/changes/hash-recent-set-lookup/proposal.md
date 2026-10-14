# Proposal

## Why

`recent_set_top_cards` joins every slice row to `recent_set_cards` with one index probe per row. On Modern 2 weeks that is about 51k probes, which account for roughly 89% of the query's buffer reads. In the abandoned `merge-trending-rpcs` benchmark, checking recent-set membership once as a hashed lookup cut that query's body from 568 ms to 423 ms. That gain was never measured on the standalone function. This change is a load optimisation, not a fix: there is no current symptom, and the trending calls stay under the 3 s `anon` timeout today.

## What Changes

- Rewrite the body of `public.recent_set_top_cards`. The inner join to `recent_set_cards` becomes a membership test in the select list, `dc.scryfall_name in (select card_name from recent_set_cards)`. Postgres computes this once as a hashed SubPlan and then does one hash probe per row. The set code is looked up afterwards, once per output card.
- The signature, return columns, grants, filter block and results stay identical.
- Ship only if it measurably wins. Benchmark the rewrite against the current function under a forced generic plan, which is the plan a `language sql` function actually runs with. Use Modern and Pauper at 7 days and 2 weeks. If the rewrite is not faster, or its output differs in any row, abandon the change and record the numbers.
- Update the `schema.sql` comments that describe the recent-set join, including the comment on `deck_cards_scryfall_name_idx`, which currently lists that join as one of its users.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Results are unchanged, so no requirement changes and the change sets `skip_specs: true`. The existing requirement "Trending tables load on the largest slices" in `trending-cards-view` still governs it.

## Impact

- **Database:** one function in `supabase/schema.sql`, `recent_set_top_cards`. This change is the explicit migration task that permits editing that file.
  - It must be re-applied by hand in the Supabase SQL editor. `create or replace` keeps the same signature, so the grants persist.
  - No table, index or RLS policy changes.
  - `top_cards` and `illegal_deck_ids` are untouched.
- **Frontend:** none. Same RPC, same response shape, and nothing changes on screen.
- **Scraper / pipeline:** none. The time-window model and the 30-day retention are unaffected.
- **Blast radius:** the Top New Cards table only. A broken function body would surface as that table's existing error state, and the other three trending tables would be unaffected.
