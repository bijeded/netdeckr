## Context

The metagame breakdown is derived at read time from the retained 30 days of `deck_cards`. Trending cards are similarly derivable — `deck_cards.card_name`, `quantity`, `board`, and `type_line` are already populated by the scraper + Scryfall mapping, so no new scraping is needed. The one real constraint is volume: the largest formats (MO ~1,170 decks, PAU ~1,167) hold ~88k `deck_cards` lines over the corpus, so pulling every line to the browser to aggregate is multi-MB per format load. This design leans on server-side aggregation for the copy counts while keeping the period-delta and filter logic client-side, mirroring the `add-week-over-week-share-delta` corpus pattern.

## Goals / Non-Goals

**Goals:**
- A copy-share-ranked mainboard "Trending" table (top 10) with a time-frame-aware period delta.
- A lighter "Top Sideboard Cards" list (top 10, no delta).
- Both respect the sidebar filters and exclude basic lands; localized ES/EN with English card names.
- Keep client payloads small via a read-only Postgres aggregation.

**Non-Goals:**
- No new scraping or scraper change.
- No deck-inclusion-rate metric (copy share was chosen deliberately).
- No period delta on the sideboard list, and none within a single event.
- No change to metagame share %, tiers, trend arrows, or existing StatCard totals.

## Decisions

- **Metric = copy share, not deck-inclusion rate.** A card's value = its summed copies ÷ total copies in the slice/board. Rationale: the user wants 4-ofs weighted over 1-ofs. Alternative (deck-inclusion rate) rejected per that call.
- **Server-side aggregation for copy counts.** A read-only Postgres view/RPC returns per-(format, card, board) total copies + distinct-deck counts filterable by date (and, for filter-awareness, by archetype/event). Chosen over pull-and-aggregate-in-JS because of the ~88k-line payload. The period delta needs two adjacent windows, so the aggregation must be **date-parameterized** (or return per-day/per-window buckets the client can slice). Leaning toward an **RPC** (`top_cards(format, start, end, board, archetype_id?, event_id?)`) so the client can call it for the current and preceding windows, or a view the client filters — settle in tasks. Basic-land exclusion lives in the aggregation's `WHERE` so basics never consume a top-10 slot before ranking.
- **Filter-awareness split.** Archetype/tier/event narrow the slice. Tier isn't a DB concept (it's a derived Power-Score classification), so tier filtering resolves to a set of archetype ids client-side, then constrains the aggregation. Event filter passes `event_id` and suppresses the delta client-side.
- **Period delta reuses the client pattern.** Same slicing math as `src/lib/shareDelta.ts`: current window vs immediately-preceding equal-length window, `DELTA_EPS` deadband, `MIN_PREV_DECKS` guard suppressing the whole column. New pure `src/lib/trendingCards.ts` for copy-share + delta so it's unit-testable without the DB.
- **UI placement + reuse.** New `TrendingTable` and `TopSideboardCards` components below the archetype grid, styled per the design reference (mono numerals, `ChangeIndicator`-family for ▲/▼/–, `CardArtPreview` on name hover/touch). New `useTrendingCards(format, window, filters)` hook owns the fetch + slice.

## Risks / Trade-offs

- **Schema deploy coupling** → the RPC/view is a manual service-role `schema.sql` deploy after merge; sequence schema PR → frontend PR so `main` is never broken (frontend ships after the RPC exists). Validate SQL with `pglast` before deploy.
- **Filter-aware aggregation complexity** → if parameterizing the RPC by archetype/event gets unwieldy, fall back to: RPC aggregates per (format, window, board, archetype_id) and the client sums the archetype rows for the active slice (still tiny vs raw lines). Decide in tasks with a payload-size check.
- **Delta within an event is meaningless** → suppress the column when an event filter is active (explicit rule, not a silent zero).
- **Basic-land detection depends on `type_line`** → a Scryfall miss leaves `type_line` null; treat null as "not a basic land" (keep it) so a resolution gap never hides a real card, accepting that a mis-resolved basic could slip through (rare).

## Migration Plan

1. Add the view/RPC to `supabase/schema.sql` (idempotent, RLS anon-select); validate with `pglast`; open the schema PR.
2. After merge, apply `schema.sql` with the service-role key in the Supabase SQL editor (assistant has anon only).
3. Ship the frontend PR (hook + components + i18n) — it reads the now-existing RPC.
4. Rollback: the frontend degrades to an empty/hidden trending section if the RPC is absent; the view/RPC is additive and droppable with no data loss.

## Open Questions

- ~~RPC signature vs plain view~~ **RESOLVED (task 1.1):** a parameterized RPC `top_cards(p_format, p_start, p_end, p_board, p_archetype_ids bigint[], p_event_id bigint)` aggregates copies server-side and returns per-card `(card_name, total_copies, deck_count, image_url)` for the slice — the client calls it per window/board (main-current + main-previous + side-current) and computes shares/delta. Copy-share **denominator excludes basics** (RPC filters `type_line ILIKE '%basic%land%'`, which also catches snow basics; null `type_line` is kept). The `MIN_PREV_DECKS` guard and archetype/event slice membership come from `useMetagame`'s existing deck fetch, so no extra deck query.
- Confirm the desktop 2/3 · 1/3 trending/sideboard split and the mobile-stacked breakpoint against the design prototype (CSS grid/flex below the archetype grid; reuse the existing responsive breakpoint used by the sidebar drawer).
