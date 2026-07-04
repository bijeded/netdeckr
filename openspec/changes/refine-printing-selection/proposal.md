## Why

The Scryfall resolver sometimes picks a special-treatment printing (borderless, showcase, extended-art, full-art, textless) for a card — e.g. Opt and Stock Up show fancy alternate art instead of the plain version. The current heuristic only demotes `promo` / Universes Beyond printings, so borderless/showcase printings that ship inside a normal set look "standard" and can win, giving decklist card images and archetype signature-card art the wrong look.

## What Changes

- Broaden the "special printing" definition so the resolver demotes any printing that is `full_art`, `textless`, `border_color == "borderless"`, or carries a `showcase`/`extendedart`/`inverted` frame effect — in addition to the existing `promo` / `universesbeyond` demotion.
- Add a set-type preference tier: prefer `expansion`/`core`/`masters` printings, demote `commander`/`draft_innovation`, keep everything else neutral.
- Reorder the printing selection key so **plain treatment ranks above set-type and recency** — a plain printing in an older set beats a borderless printing in a newer set. Recency only breaks ties among equally-plain printings.
- Do **not** filter on `border_color == "black"` — white/silver/gold borders are legitimate plain printings and must stay eligible; only `borderless` is demoted.
- Because deck-card images and archetype signature-card art resolve through the same `CardIndex`, this single resolver change fixes both surfaces; the signature-*card* selection is unchanged.

No schema change and no frontend change. Post-merge requires the standard one-time `--remap-scryfall` pass to re-resolve existing rows and refresh archetype art.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `scryfall-card-mapping`: the printing-selection requirement changes — special-treatment demotion is broadened, a set-type preference tier is added, and plain treatment is prioritized over recency.

## Impact

- `scraper/scryfall.py` — `_is_special_printing` and `_selection_key` (plus supporting helpers / set-type tiering); the `Printing` dataclass and `_is_paper_nonfoil` may need the extra raw fields available during selection.
- `scraper/tests/` — new fixtures / cases covering borderless, showcase, full-art, textless, and commander/draft-innovation printings; and the plain-over-recency ordering.
- Both `deck_cards` images and `archetypes` signature-card art (via the shared resolver) — corrected on the next scrape and the one-time `--remap-scryfall` maintenance run.
- No schema migration; no frontend changes.
