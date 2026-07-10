## Context

`color_identity_from_decks(deck_color_sets)` in `scraper/mtgtop8.py` derives an archetype's WUBRG identity from the union of its decks' Scryfall color identities, keeping a color when `count >= COLOR_IDENTITY_MIN_DECK_SHARE * n` (0.35 × deck count). This is a pure **share** rule. On tiny archetypes it breaks down: with `n = 2`, the threshold is `0.7`, so a color in a single deck (`count = 1 ≥ 0.7`) is kept — a one-off splash leaks a pip (observed live: PAU Bogles → WUG on 2 decks). It runs only as the fallback when the archetype **name** yields no color (`color_identity_for`), and feeds `SupabaseWriter.refresh_archetype_color_identity`, which change-detects and PATCHes `color_identity` each run.

## Goals / Non-Goals

**Goals:**
- Stop single-deck splashes from adding a pip on small archetypes, without raising the share (which would also drop legitimate base colors on those same small archetypes).
- Preserve current behavior on larger fields and keep the function pure and idempotent.
- Never blank a genuinely tiny (1-deck) archetype that has real colors.

**Non-Goals:**
- No change to name-derived identity (`color_identity_for`), the writer, the schema, or the frontend.
- No re-tuning of `COLOR_IDENTITY_MIN_DECK_SHARE` (0.35 stays; base colors are correct on real samples).

## Decisions

**1. Add an absolute deck-count floor, ANDed with the share, capped at the deck count.**
Keep a color when `count >= max(COLOR_IDENTITY_MIN_DECK_SHARE * n, min(COLOR_IDENTITY_MIN_DECK_COUNT, n))`, with `COLOR_IDENTITY_MIN_DECK_COUNT = 2`.
- `n = 2`: `max(0.7, min(2,2)=2) = 2` → a 1-deck splash (count 1) is dropped; a base color in both decks (count 2) is kept. **Fixes the leak.**
- `n = 1`: `max(0.35, min(2,1)=1) = 1` → the lone deck's colors are kept (no regression; base vs splash is indistinguishable with one deck).
- `n = 10`, splash in 4: `max(3.5, 2) = 3.5` → count 4 kept, exactly as today — the share dominates once `0.35 n ≥ 2` (i.e. `n ≥ 6`), so large fields are untouched.

*Alternatives rejected:* (a) a hard floor of 2 (not capped) — blanks every legitimate 1-deck archetype → gray, a visible regression; (b) raising the share — can't separate a 0.5-share splash from a 0.5-share base color on a 2-deck archetype.

**2. Keep it a pure, self-contained function change.**
Only `color_identity_from_decks` and a new module constant change; `refresh_archetype_color_identity` / `_card_color_identity` already pass one color-set per deck, so the floor sees the real deck count. The change is idempotent (recomputed each run) — the writer's change-detection means unchanged decks yield an unchanged PATCH.

**3. Reach existing rows with the standard maintenance pass.**
As with prior derivation tweaks, a one-time `--refresh-color-identity` run (Actions `format=refresh-color-identity`, service-role) recomputes stored identities against the new rule. No new mode is added — this one already exists.

## Risks / Trade-offs

- **A legitimate two-color deck pair where each color is genuinely in only one of two decks** → would now read as colorless-from-cards. This is inherent to a 2-deck sample (indistinguishable from a splash); acceptable, and self-corrects as more decks accumulate. Mitigation: the floor is small (2) and capped, and name-derived identity (the primary signal) is unaffected.
- **Constant tuning** → `COLOR_IDENTITY_MIN_DECK_COUNT` sits beside `COLOR_IDENTITY_MIN_DECK_SHARE` with a comment; tests don't depend on the exact value.

## Migration Plan

Scraper-only; merges with no schema step. Post-merge run `gh workflow run scrape.yml --ref main -f format=refresh-color-identity` (service-role) once to correct existing rows, then spot-check the previously-leaking samples (e.g. PAU Bogles) read correctly. Rollback = revert the PR (the next scheduled scrape's refresh restores prior values). Verify live read-only before and after.

## Open Questions

- None. Floor value (2) and cap-at-deck-count semantics were confirmed; the share constant is unchanged.
