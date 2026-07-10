## Why

The card-derived color-identity fallback keeps a color when it appears in at least a **share** of an archetype's decks (`COLOR_IDENTITY_MIN_DECK_SHARE` = 0.35). On a **tiny archetype** a single off-color deck clears that bar — e.g. on a 2-deck archetype one splash deck is 0.5 share ≥ 0.35 — so a one-off splash leaks a color pip (surfaced live: PAU Bogles → WUG on 2 decks). Raising the share can't fix it (a legitimate base color on a 2-deck archetype is also only 0.5).

## What Changes

- Add a **minimum absolute deck-count floor** to `color_identity_from_decks` (`scraper/mtgtop8.py`): a color is kept only when it appears in **both** at least the share *and* at least a floor number of decks. A single-deck splash on a small archetype is dropped while base colors (which appear in ≥2 decks) survive.
- The floor is **capped at the archetype's deck count** (`required = max(share × n, min(FLOOR, n))`, `FLOOR = 2`), so a legitimate **1-deck** archetype (where base vs splash cannot be distinguished) keeps its single deck's colors instead of going gray — no regression for tiny archetypes.
- Existing large-field behavior is unchanged: when `share × n ≥ FLOOR` the share threshold already dominates.
- Re-run the one-time **`--refresh-color-identity`** maintenance pass (Actions `format=refresh-color-identity`) after merge so existing rows pick up the corrected identities.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: tightens the card-derived color-identity fallback with an absolute minimum-deck-count floor (capped at the deck count) so small-sample splashes no longer add a pip, while genuinely tiny archetypes keep their colors.

## Impact

- **Scraper only.** No schema, frontend, or dependency change.
- `scraper/mtgtop8.py` — `color_identity_from_decks` gains the deck-count floor (new `COLOR_IDENTITY_MIN_DECK_COUNT` constant); `refresh_archetype_color_identity` / `color_identity_for` unchanged.
- `scraper/tests/` — new cases for the 2-deck splash, the 1-deck keep, and large-field parity.
- Post-merge: a one-time `--refresh-color-identity` run (service-role, via `workflow_dispatch`) to correct stored rows; recomputed values for unchanged decks are otherwise idempotent.
