# Design

## Context

See proposal.md for motivation; requirements are in `specs/recent-main-sets` and `specs/trending-cards-view`.

- `deck_cards.set_code` is the **display printing** chosen by `_selection_key` (`scraper/scryfall.py`) for art and Arena export: plain treatment, then expansion/core, then newest. It is not set membership.
- Deck-card rows are resolved once, at scrape time. The backfills only fill null columns, so a row written before a set's release keeps its earlier `set_code` forever (within the 30-day retention).
- The resolver ignores release dates. During a set's preview season, a reprint's display printing can already resolve to that unreleased set.
- `CardIndex.from_bulk_rows` streams the daily `default_cards` bulk file once, building the name→printing index and the per-format banlist in the same pass. Every row carries `set`, `set_name`, `set_type`, `released_at`, `digital`, and `games`.
- The three existing tables come from the `top_cards` RPC, one call per board, partitioned and ranked in `src/lib/trendingCards.ts`, and rendered by the shared `TopCardsTable` inside `.trending-layout` (`src/styles/dashboard.css`, three equal columns that stack below 900px).

## Goals / Non-Goals

**Goals:**
- Membership answers "is this card printed in FRA or HOB", independent of the display printing and of when the row was scraped.
- Reuse the existing slice plumbing (window, archetype, event, size ids, legality) unchanged.

**Non-Goals:**
- Fixing the display printing's preview-season behavior or re-resolving stale `deck_cards` rows. Both are separate concerns this design routes around.
- Changing `top_cards` or the three existing tables' rules (they still exclude every land).

## Decisions

### D1. A pipeline-built membership table, not a `deck_cards.set_code` filter

A new table `recent_set_cards (card_name text primary key, set_code, set_name, released_at)` holds every canonical name printed in the two recent main sets. The pipeline rebuilds it each run, and the RPC joins `deck_cards.scryfall_name = recent_set_cards.card_name`.

Alternatives considered:
- *Filter on `deck_cards.set_code`.* Needs no schema change, but it undercounts reprints. Rows scraped before release keep the older code, so in a window that crosses release day only the post-release decks count. It also inherits the preview-season flip. Rejected.
- *Store a debut-set column per deck card.* Answers a different question (new cards only). Reprints were explicitly in scope, so rejected.
- *Fetch `api.scryfall.com/sets` from the browser.* Adds a runtime third-party dependency, and the browser still couldn't know a card's membership without bulk data. Rejected.

Joining on the canonical name follows `banned_cards`: plain equality, no normalization, and an unresolved card (null `scryfall_name`) can never match. A resolution gap undercounts rather than miscounts.

### D2. Derive the sets and membership in the existing bulk pass

`from_bulk_rows` gains a `today` input. For each row of a qualifying set (`set_type` in `{expansion, core}`, not `digital`, `"paper"` in `games`), it records `name` under that set, along with the set's earliest row `released_at`. Membership ignores `_is_paper_nonfoil`'s treatment and finish rules, because any printing in the set counts. `reversible_card` rows are skipped, as the banlist pass already does, since their doubled name matches no deck card. At the end the pass drops every set whose release date (its earliest row's) is after `today`, keeps the two remaining sets with the latest release date (set-code tiebreak), and builds name→(newer set) for the cards in them. The release-date check is per set, not per row, so one oddly dated row can't split a set's membership.

Accumulating names for every qualifying set before picking two costs roughly one string reference per expansion/core printing ever made. That is small next to the printing index the same pass already builds. A running top-two prune is possible but not worth the complexity.

`today` comes from `run.py`, which already passes it to `sync_bulk` and `refresh_banlist`, so tests control it directly. That is how the "previewed set is not chosen" scenario is tested.

### D3. Reconcile the table, don't delete-then-insert

The writer reconciles the table the way `refresh_banlist` does, in this order: read the stored rows (paged past PostgREST's 1000-row cap), upsert added or changed rows, then delete rows whose `set_code` is outside the new pair with one request (the release rollover), then delete any remaining stray names one by one. Upserting before deleting means a read mid-reconcile never sees a thinner table. Delete-then-insert through PostgREST is two non-atomic requests, and a dashboard read landing between them would render an empty "Top New Cards". A reconcile also leaves an unchanged day write-free, which satisfies the idempotence scenario.

The reconcile is format-independent and runs once per pipeline invocation, next to the banlist refresh. It is best-effort, like the banlist: an exception is logged and the scrape continues. The scraper already fails the run before this step if no index is available (`scryfall-card-mapping`), so a failed sync never reaches the write, and the previous rows survive.

Added during implementation: the writer also refuses an **empty** card set (raises, logged by the run) instead of reconciling the table to nothing. A usable index that yields no recent-set cards means the bulk data changed shape (a relabeled set type, for instance), and applying it would blank the table for every visitor.

### D4. A dedicated RPC rather than widening `top_cards`

`recent_set_top_cards(p_format, p_start, p_end, p_archetype_ids, p_event_id, p_event_ids)` returns `card_name, total_copies, deck_count, image_url, set_code`. It takes the same slice parameters and the same `not exists` banned-deck clause as `top_cards`, with three differences:
- no board predicate (main and side are summed, and `deck_count` is `count(distinct deck_id)` across both boards);
- the land predicate is `type_line is null or type_line not ilike '%basic%land%'` (basic lands only; `Basic Snow Land — Forest` and `Basic Land — Wastes` match);
- an inner join to `recent_set_cards`.

It groups by `dc.card_name` (the display name, as `top_cards` does) and takes `max(r.set_code)`, which is constant per name.

Widening `top_cards` with a board-null mode, a land-mode flag, and an optional join would turn one simple function into a three-way switch, and would change a signature the existing tables depend on. A second function keeps both readable. The duplicated filter block is accepted: it is short, and both functions sit next to each other in `schema.sql`.

Both new objects get `security invoker`, an anon read policy on the table, and `grant execute ... to anon, authenticated`, matching `banned_cards` / `top_cards`.

### D5. Frontend: one more call in the existing hook

`useTrendingCards` adds a third parallel call (skipped, returning `[]`, when `format === 'PREM'`) and exposes `newCards`. `TrendingCard` gains an optional `setCode`. Ranking reuses `rankTrendingCards`: same order (copies, then decks, then name), same top 10.

Added after the first preview, at the user's request: the third call settles on its own. A rejection becomes a separate `newCardsError` and an empty `newCards` instead of rejecting the shared `Promise.all`. That rejection used to put the hook in its error state, emptying all four tables. The trigger was the window between deploying the frontend and applying the schema (or any RPC outage), when a missing `recent_set_top_cards` would have blanked the three tables that don't depend on it. Superseded: the original single shared failure path.

`TopCardsTable` gains a `showSet` prop that adds a chip column. Column order is rank · card · set · copies. The avg column stays off for this table, as for Sideboard. Placement before copies is confirmed on the Vercel preview (PR #202).

The dashboard renders the fourth table only when the format is not Pre-Modern. `.trending-layout` becomes `repeat(2, 1fr)`. DOM order is Creatures, Spells, Sideboard, New Cards, so the 2x2 grid, the Pre-Modern position (Sideboard in row 2, col 1), and the stacked mobile order all follow from source order with no `grid-area` rules.

Width (calculated): at the 1240px content max with a 22px gap, each table is ~609px wide. The card-name column grows from ~165px (three-up) to ~370px, leaving room for the chip.

### D6. The set chip

A mono chip showing the set code. It sits on the table surface, not on card art, so the over-art contrast rule doesn't apply. `CHIP_BASE`'s dark backdrop and blur exist for over-art chips and aren't required here. Whether to reuse its shape for consistency, and the chip's color (neutral `--text-muted` on a hairline border vs. a neon tint), are **pending visual confirmation**. Whichever is chosen, its text must clear 4.5:1 against the chip's own background. Check this with the token ratios once the colors are picked.

Settled on the Vercel preview (PR #202): `--text-muted` (#8b8d9e) mono text with a `--border-soft` hairline and no fill, so `CHIP_BASE` is not reused and there is no neon tint, in a 52px column placed before Copies. Calculated contrast: 5.68:1 against `--surface-card` (#11121b) and 5.99:1 against `--bg-app`. Both clear 4.5:1.

### D7. Copy

- Title: `trending.newCardsTitle` = "Top New Cards" / "Top Cartas Nuevas" (calculated: matches the existing "Top …" pattern; ES follows "Top Criaturas").
- Empty state: a new `trending.newCardsEmpty` key. Wording confirmed on the preview: "No new-set cards played yet" / "Aún no se juegan cartas de los sets nuevos".
- Set codes and card names are not localized.

## Risks / Trade-offs

- [Release week: few decks play the newest set] → Covering two sets is the agreed mitigation. An empty slice still shows the localized empty state.
- [Scryfall `released_at` is the official release date; a few days of prerelease/early events can include the set first] → Those cards just won't count until release day. Acceptable, and it errs toward fewer rows, not wrong ones.
- [Stale `type_line` null on very old rows makes a basic land slip in] → `type_line is null` rows are kept, as `top_cards` does. Unresolved rows can't join anyway, and resolved rows have carried `type_line` since the metadata backfill. Low risk.
- [`set_type` reclassification by Scryfall (e.g. a UB set labeled differently)] → The run logs the chosen pair each time (`recent-sets: FRA, HOB`), so a wrong pick shows up in the workflow output.
- [Duplicated filter clauses between the two RPCs drift] → Kept adjacent in `schema.sql` with a comment cross-referencing each other.
- [A 2x2 grid makes the existing three tables wider, changing their look] → User-visible. Confirmed on the Vercel preview before merge.

## Migration Plan

1. Apply the `schema.sql` additions (table, RLS policy, RPC, grant) to Supabase manually. They are additive: no existing object changes, so the current production frontend is unaffected.
2. Merge the scraper change. The next pipeline run populates `recent_set_cards`, or trigger `workflow_dispatch` with `all`.
3. Ship the frontend behind the Vercel preview. Confirm the pending visual items, then merge.

Rollback: revert the frontend. The table and RPC can stay (unused and harmless) or be dropped.

## Open Questions

None. Chip styling and placement, the empty-state wording, and the 2x2 layout (desktop, Pre-Modern, phone width) were confirmed on the Vercel preview of PR #202.
