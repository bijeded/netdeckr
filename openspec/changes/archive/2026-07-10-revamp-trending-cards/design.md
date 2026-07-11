## Context

The trending surface (shipped in `add-trending-cards-table`) renders two components — `TrendingTable` (mainboard, copy-share ranked) and `TopSideboardCards` — fed by `useTrendingCards`, which makes two `top_cards` RPC calls (main + side) and ranks the rows in the pure `trendingCards.ts` lib. The `top_cards` RPC groups `deck_cards` by `card_name` and already reads `type_line` to exclude lands, but does not return it. This change reshapes the surface into three tables and swaps the metric, so it touches the RPC, the lib, the hook, the components, layout CSS, and i18n.

## Goals / Non-Goals

**Goals:**
- Split the mainboard into Trending Creatures + Trending Spells by Scryfall card type.
- Replace copy-share with total copies everywhere, and add an average-copies-per-deck (`Nx`) column on the two mainboard tables.
- One shared table component (`TopCardsTable`) driving all three mounts; delete the old duplicate component and dead copy-share code/i18n.
- Keep the existing server-side aggregation model (no client pull of raw `deck_cards`).

**Non-Goals:**
- No change to the scraper, `deck_cards` schema, or how `type_line` is populated.
- No period-over-period delta (already removed previously; not reintroduced).
- `ShareDelta` and archetype-share deltas are untouched — they are unrelated to this surface.

## Decisions

**1. Split creature/spell server-side via a returned `category`, keep two RPC calls.**
The `top_cards` RPC gains a `category text` output column: `case when dc.type_line ilike '%creature%' then 'creature' else 'spell' end` (lands are already filtered out in the WHERE clause, so `spell` never includes lands). Because the RPC `GROUP BY card_name` already collapses to a few hundred distinct cards per slice (not the ~88k raw lines), the main-board call returns a small result that `trendingCards.ts` partitions into creatures vs spells client-side. This keeps the hook at two calls (main + side) rather than adding a third, and keeps the type logic in one SQL expression.
- *Alternative considered:* a `p_category` parameter and a third RPC call. Rejected — more round trips and RPC surface for no benefit, since the grouped result is already tiny.
- *Note on group key:* `type_line` must be functionally dependent on `card_name` for the GROUP BY to accept `case ... type_line ...`; it isn't guaranteed at the SQL level, so the category expression uses an aggregate (`case when max(...) ...` or `bool_or(type_line ilike '%creature%')`) to stay valid and deterministic.

**2. `TopCardsTable` (title, cards, showAvg) replaces both components.**
Trending Creatures and Trending Spells mount it with `showAvg`; Top Sideboard mounts it with `showAvg={false}`. The sideboard therefore renders rank · card · copies with the same header/container as the mainboard tables (height parity satisfied). `TopSideboardCards.tsx` is deleted and `TrendingTable.tsx` becomes/relocates to `TopCardsTable.tsx`. The shared `TrendingCardName` (dashed underline + `CardArtPreview`) moves with it.

**3. Metric shape in `trendingCards.ts`.**
`TrendingCard` drops `sharePct` and gains `avgCopies` (rounded integer). `rankTrendingCards` stops summing a denominator; it sorts by `totalCopies desc → deckCount desc → name`, slices `topN`, and computes `avgCopies = deckCount > 0 ? Math.round(totalCopies / deckCount) : 0`. A `category` field on `TopCardRow` plus a small partition helper (or a `category` arg) yields the creature vs spell subsets before ranking each independently.

**4. Hook returns three lists.** `useTrendingCards` returns `{ creatures, spells, sideboard, loading, error }`. The main RPC rows are partitioned by category then ranked into `creatures`/`spells`; the side rows rank into `sideboard`.

**5. Layout: three equal columns, one breakpoint.** `.trending-layout` becomes `grid-template-columns: repeat(3, 1fr)`; below ~900px it collapses to `1fr` (single column, source order Creatures → Spells → Sideboard). The existing 640px rule is replaced by a 900px rule for this element.

## Risks / Trade-offs

- **MDFC / split faces** (e.g. `Creature // Sorcery`, adventure cards) → the single `type_line` string is checked for "Creature", so a card with a creature face anywhere in its type line lands in Creatures. Acceptable and consistent with how the community reads these; documented in the RPC comment alongside the existing land-exclusion note.
- **Null `type_line`** → categorized as `spell` (the `else` branch). This matches the current land filter, which keeps null-type_line cards. Rare and low-impact.
- **Schema re-apply** → `top_cards`'s return signature changes, so the deploy must `drop function`/`create or replace` under the service-role key (assistant has anon only). Same manual step as the prior trending change; flagged in tasks.
- **App.test breakage** → `useTrendingCards`'s return shape changes; `App.test.tsx`'s mock must return `{ creatures, spells, sideboard }` with non-empty defaults (per the App.test/Supabase-mock gotcha) or the frowny-count assertions break in CI.

## Migration Plan

1. Land the RPC change in `schema.sql`; after the code PR merges, re-apply the function under the service-role key (idempotent). Old callers still work only after the frontend is updated, so deploy order is: merge schema-inclusive PR → re-apply function → the new frontend reads the `category` column.
2. Rollback: revert the PR and re-apply the previous `top_cards` definition (kept in git history).

## Open Questions

None — the four design decisions (avg over decks running the card, ~900px stack, shared `TopCardsTable`, sideboard without avg) were settled during exploration.
