# Design

## Context

See proposal.md, Why.

`recent_set_top_cards` is a `language sql` function declared with `set search_path`. That clause stops Postgres from inlining it, so the body runs on the plan Postgres builds without knowing the parameter values (the generic plan). The planner therefore misestimates the size of the slice. Today it reaches `recent_set_cards` with a nested loop: one primary-key probe per `deck_cards` row in the slice, every board and every card type. The filters that come after the join throw most of those rows away.

`fix-trending-rpc-timeouts` already solved the same problem for the legality filter. There, `NOT IN` makes the subquery run once and become a hash table, and each row then costs a hash probe. Postgres never rewrites `NOT IN` into a join. Membership in `recent_set_cards` is a positive `IN`, and Postgres does rewrite a top-level `IN` in `WHERE` into a semi-join, which reintroduces the per-row probe. So the test has to sit somewhere the planner leaves alone.

## Goals / Non-Goals

**Goals:**
- Look up recent-set membership once per call instead of once per slice row, with byte-identical results.
- Decide whether to ship on numbers from the plan production actually runs (generic), not on intuition.

**Non-Goals:**
- `top_cards` and its 1,000-row cap. That is a separate open item; see the project memory `trending-rpc-merge-measured`.
- Merging RPCs, or changing the frontend or the response shape.
- New indexes.

## Decisions

### 1. Membership test as a hashed SubPlan in the select list

The slice rows are computed in a subquery whose select list carries

```sql
dc.scryfall_name in (select rs.card_name from public.recent_set_cards rs) as is_recent
```

The outer query then filters `where s.is_recent` and groups by `card_name`.

**Why the select list:**
- Postgres converts sublinks to joins (`pull_up_sublinks`) before it pulls subqueries up into the outer query.
- A sublink in a select list is never converted, so it stays a SubPlan. Because the subquery is uncorrelated and small (two sets' worth of names), Postgres hashes it: it is read once, then one hash probe per row.
- If the subquery is later pulled up and `is_recent` ends up as a scan filter, it is still a hashed SubPlan by then, which is fine.
- This is the B3 shape from the merge benchmark.

**Null handling matches the inner join.** A null `scryfall_name` gives `null in (...)`, which is null, which `where` rejects. `recent_set_cards.card_name` is the primary key, so it has no duplicates and no nulls.

**Alternatives:**
- *`where (dc.scryfall_name in (...)) is true`.* Wrapping the test in `is true` (or `coalesce`) also stops the semi-join rewrite. This is the fallback if `EXPLAIN` shows the select-list form being turned back into a join. It is not the first choice because the user named the select-list form.
- *`= any(array(select ...))`*, as `illegal_deck_ids` uses. That produces an InitPlan array and a linear scan of about 600 names per row, which is worse than a hash probe.
- *Keep the join and add `enable_nestloop = off` to the function.* This is brittle and affects the whole plan.

### 2. Set code looked up per output card, not per row

The hashed SubPlan returns a boolean and cannot carry `set_code`. Instead of joining the table back per row, the outer select reads

```sql
(select max(r.set_code) from public.recent_set_cards r
  where r.card_name = any (array_agg(distinct s.scryfall_name))) as set_code
```

- The aggregate's argument refers only to outer columns, so the aggregate belongs to the outer `group by`. The subquery then runs once per output card, a few hundred primary-key probes at most.
- It takes `max` over every matched canonical name, exactly like today's `max(r.set_code)`. So the output stays identical even in the theoretical case where one display name maps to two canonical names.

**Alternative:** `max(s.scryfall_name)` with an equality probe. It is simpler but not exactly equivalent in that edge case, and the cost is the same.

### 3. Ship gate: forced-generic benchmark plus row-level equivalence

Both checks run in the Supabase SQL editor, which is read-only apart from session-temporary objects. The candidate is created as `pg_temp.recent_set_top_cards_hashed`, with the same signature, `language sql stable security invoker set search_path = public`. It therefore runs the same non-inlined, generic plan as the real function would.

- **Timing:** `EXPLAIN ANALYZE` execution time, three runs each with the median reported, for the current and candidate functions.
  - Unfiltered cases: MO and PAU at 7 days and 2 weeks.
  - Filtered cases: one single event and one archetype filter, to catch a regression on small slices, where hashing the table once is overhead.
  - One `EXPLAIN` of the candidate body under `set plan_cache_mode = force_generic_plan` confirms `hashed SubPlan` on `recent_set_cards` and no join to it.
- **Equivalence:** `except all` in both directions between the current and candidate functions, over every format × window plus the filtered cases, comparing all five columns. It must return zero rows.
- **Pass:** zero differing rows, a median at least 15% faster on both MO and PAU at 2 weeks, and no filtered case slower by more than about 5 ms.
  - The 15% bar is an assumption made here. Run-to-run noise in the merge benchmark was about 5–10%, and B3 promised about 25%.
- **Fail:** abandon, delete the change, and add the numbers to the project memory, as was done for `merge-trending-rpcs`.

## Risks / Trade-offs

- **The planner rewrites the select-list test into a semi-join anyway.** Mitigation: the `EXPLAIN` in the gate catches it, and the fallback is the `is true` form from Decision 1.
- **The gain is smaller standalone than in the merged benchmark.** The merged body shared one slice scan across three tables, while the standalone function also aggregates far fewer rows. Mitigation: that is exactly what the gate measures. A null result is an acceptable outcome.
- **Small filtered slices get slower.** Hashing about 600 names costs well under 1 ms. Mitigation: the filtered cases in the gate.
- **The filter blocks of `top_cards` and `recent_set_top_cards` drift apart.** The filter block is not touched, and the sync comment stays.

## Migration Plan

1. The gate passes in the SQL editor (Decision 3), on the scripts the user runs.
2. Before applying anything, snapshot the current outputs through the API with the anon key, for every format × window, using `rpc.py`.
3. Edit `supabase/schema.sql`, open a PR, and merge when CI is green. The change isn't user-visible and doesn't touch process files, so the standing merge authorization applies.
4. The user applies the `recent_set_top_cards` block in the Supabase SQL editor (`create or replace`, same signature, grants kept).
5. Re-fetch through the API and diff against the step 2 snapshot. Expect zero differences.

**Rollback:** re-apply the previous function body from `main` before this PR (`git show <base>:supabase/schema.sql`) and revert the PR.
