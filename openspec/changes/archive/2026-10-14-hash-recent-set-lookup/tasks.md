# Tasks

## 1. Ship gate (SQL editor, before any repo edit)

- [x] 1.1 Write a gate script to the session scratchpad, following design Decision 3. The script:
  - creates `pg_temp.recent_set_top_cards_hashed` (the Decision 1 + 2 body, the same attributes as the real function);
  - times current vs candidate (MO and PAU at 7 days and 2 weeks, one single event, one archetype filter; three runs; median);
  - runs `EXPLAIN` on the candidate body as a prepared statement under `force_generic_plan`;
  - runs the `except all` equivalence over every format × window plus the filtered cases.
  
  It is read-only apart from `pg_temp` and prepared statements, and returns one result table plus the plan. Verify the script by reading it against Decision 3 before handing it to the user.
- [x] 1.2 The user runs the script and pastes the results. Verify the pass criteria:
  - zero differing rows;
  - `hashed SubPlan` over `recent_set_cards` in the plan, with no join to it (if a join appears, switch to the `is true` fallback and re-run);
  - MO and PAU 2 weeks at least 15% faster at the median;
  - no filtered case slower by more than about 5 ms.
  
  On fail, stop: report the numbers, and with the user's go-ahead delete the change and add the results to the project memory.

## 2. Function rewrite

- [x] 2.1 Snapshot the current `recent_set_top_cards` outputs through the API with the anon key, for every format × window (`rpc.py`, saved to the scratchpad), before anything is applied. Verify every call returns 200 and Modern 2 weeks is non-empty.
- [x] 2.2 In `supabase/schema.sql`, replace the `recent_set_top_cards` body with the version that passed the gate. Update its header comment (third bullet: membership via a hashed SubPlan, not an inner join, and why the select list) and the `deck_cards_scryfall_name_idx` comment, which no longer serves the recent-set join. Record the measured before/after in the function comment, as `top_cards` does. Verify with `git diff supabase/schema.sql`:
  - only that function and those two comments changed;
  - the signature and grant are unchanged;
  - the filter block is still identical to `top_cards`'.

## 3. Integration

- [x] 3.1 Run `npm run lint`, `npm run type-check` and `npm run test`, and verify all pass. Then open the PR on `task/hash-recent-set-lookup` and merge once `ci` is green; the change isn't user-visible and touches no process files.
- [x] 3.2 After the user applies the function block in the Supabase SQL editor, re-fetch every format × window through the API. Verify:
  - zero differences against the 2.1 snapshot;
  - every call returns 200;
  - Modern 2 weeks shows Top New Cards on the production site.

## Workflow follow-up

- Run `/opsx:sync` (no spec delta, so a no-op) and `/opsx:archive` once 3.2 passes.
- Update the project memory `trending-rpc-merge-measured`: mark the hashed recent-set lookup shipped or abandoned, with its numbers.
