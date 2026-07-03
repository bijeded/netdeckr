## Context

`add-card-art` shipped archetype signature cards, choosing the most-played card after excluding **basic** lands by name (`_BASIC_LAND_NAMES` in `scraper/supabase_writer.py`), with alphabetical name as the only tiebreak. Two weaknesses remain: (1) a nonbasic land can win the slot, and (2) among equally-played cards the pick is arbitrary. We now have Scryfall bulk data resolving each card to a printing, so we can carry richer per-card metadata (`type_line`, `rarity`, `cmc`, set `released_at`) and the `art_crop` image, and use them to pick a truer signature.

The pipeline is a Python scraper writing to Supabase via raw PostgREST (service-role in CI); the browser reads via RLS anon. Schema is manual (`supabase/schema.sql`, idempotent `add column if not exists`, applied by a human/CI with the service-role key). Selection currently runs in `_signature_card` / `refresh_archetype_art`, recomputed every run.

## Goals / Non-Goals

**Goals:**
- Exclude all lands from signature selection via `type_line`, not a name list.
- Rank non-land candidates by quantity → rarity → set recency → cmc → name, deterministically, degrading gracefully on null metadata.
- Persist `type_line`, `rarity`, `cmc`, `released_at` per deck_card and `art_crop_url` per archetype.
- Frontend `ArchetypeCard` prefers the crop.
- One-time `--backfill` to fill new columns and recompute art on existing data.

**Non-Goals:**
- No `--remap-scryfall`-style continuous re-resolution of all rows on every heuristic change (deferred item #2 stays deferred; the new `--backfill` is one-time).
- No `art_crop` on every deck_card — only the archetype signature record needs it.
- No change to the decklist-modal `CardArtPreview` (still uses the normal image).

## Decisions

### 1. Where selection ranking runs — in Python over fetched rows, not SQL
`_signature_card` already pages `deck_cards` and aggregates in Python. Keep that: fetch each mainboard card's `card_name, quantity, type_line, rarity, cmc, released_at`, aggregate quantity per card name, and rank in Python. Rationale: the ranking key mixes an aggregate (summed quantity) with per-card attributes and null-last ordering that is fiddly in PostgREST; Python keeps it testable with plain dicts (matching existing tests). Per-name metadata is taken from any resolved row for that name (all printings of a name share type_line/rarity/cmc/released_at for our purposes; we take the first non-null).

### 2. Ranking key with null-last semantics
Build a sort key per candidate name: `(-quantity, rarity_rank, -released_ordinal, -cmc, name)` where higher-is-better fields are negated for ascending sort and nulls map to the worst value:
- `rarity_rank`: mythic=0, rare=1, uncommon=2, common=3, null=4 (ascending → mythic first, null last).
- `released_ordinal`: date as sortable value; null → very old (sorts last under `-released_ordinal`).
- `cmc`: null → -1 (sorts last under `-cmc`).
- `name`: ascending final tiebreak (always present).
Choose `min` by this key (matches the existing `min(..., key=...)` idiom).

### 3. Land exclusion by type_line
Replace `card_name.lower() in _BASIC_LAND_NAMES` with `"land" in (type_line or "").lower()`. A null type_line is treated as non-land (not excluded) so unresolved cards can still be signature candidates — avoids silently dropping a real payoff whose metadata failed to resolve. Remove `_BASIC_LAND_NAMES`.

### 4. Printing carries metadata; `art_crop` alongside normal image
`Printing` gains `type_line: str | None`, `rarity: str | None`, `cmc: float | None`, `released_at: str | None`, `art_crop_url: str | None`. `CardIndex.from_bulk_rows` reads them from the chosen bulk row (`type_line`, `rarity`, `cmc`, `released_at`; `image_uris.art_crop` with front-face fallback, mirroring `_normal_image_url`). The deck_card writer persists the four metadata fields; `refresh_archetype_art` writes `art_crop_url` (from the resolved signature printing) alongside `art_image_url`.

### 5. Schema: additive columns
`deck_cards`: add `type_line text`, `rarity text`, `cmc numeric`, `released_at date`. `archetypes`: add `art_crop_url text`. All via `add column if not exists`; no data migration in SQL (backfill does it). `released_at` stored as `date`; ranking parses ISO strings.

### 6. `--backfill` reuses the existing backfill machinery
Extend the writer's backfill to re-resolve rows and write the new metadata columns, keyed on rows missing the new metadata (e.g. `type_line is null`) rather than `image_url is null`, so already-image-enriched rows still get the new fields. Then call `refresh_archetype_art` per format (art already recomputes every run, so this just applies the new ranking). Wire a `--backfill` flag in `run.py` mirroring `--backfill-scryfall`.

### 7. Frontend prefers crop
`useMetagameBreakdown` selects `art_crop_url` alongside `art_image_url` and exposes both (or a single `artUrl = art_crop_url ?? art_image_url`). `ArchetypeCard` uses the crop-preferred URL; gradient fallback unchanged. Keeping both in the shape avoids losing the normal image if we ever want it.

## Risks / Trade-offs

- [A DFC spell whose back face is a land gets its whole type_line flagged "Land" and excluded] → Acceptable: MTGTop8/Scryfall type lines for MDFCs like `Creature — Elf // Land` do contain "Land"; excluding these is rare and cosmetic-only. Noted; not mitigated in v1.
- [Backfill re-resolves all rows — slow/one-time cost] → It is a manual one-time op with the service-role key, same pattern as `--backfill-scryfall`; daily runs are unaffected (they enrich only new rows).
- [Null metadata after a resolution miss could skew ranking] → Null-last semantics ensure a resolved card always outranks an unresolved one at equal quantity; a fully-unresolved archetype still falls back deterministically to alphabetical.
- [`cmc` is numeric/float in Scryfall] → store as `numeric`; ranking treats missing as -1. Fine for integer-like MTG mana values.

## Migration Plan

1. Land schema+scraper+frontend in cohesive PRs so `main` never has a broken contract (schema columns are additive and nullable, so an un-applied schema only means null metadata, not breakage).
2. After merge: apply `supabase/schema.sql` in the Supabase SQL editor (service-role), then run `python scraper/run.py --backfill` once to fill new columns + recompute art, then optionally `gh workflow run scrape.yml --ref main`.
3. Rollback: columns are additive and unused-if-null; reverting the frontend to `art_image_url` restores prior behavior with no data loss.

## Open Questions

- None blocking. (`--remap-scryfall` continuous re-resolution remains a separate deferred change.)
