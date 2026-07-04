## Context

Printing selection lives entirely in `scraper/scryfall.py`. `CardIndex.from_bulk_rows` keeps, per canonical card name, a single "best" non-foil paper printing chosen by `_selection_key` (greater wins):

```
(0/1 special via _is_special_printing, released_at, set code)
```

`_is_special_printing` currently only flags `promo` and `promo_types` containing `universesbeyond`. Borderless/showcase/extended-art/full-art/textless printings that ship inside a regular set are therefore treated as "standard" and can win on the recency or set-code tiebreak, producing the wrong art for cards like Opt and Stock Up.

The resolved `Printing` (with `image_url` + `art_crop_url`) feeds two surfaces through the same `resolve()`:
- `deck_cards.image_url` (decklist card art) in `SupabaseWriter`.
- `archetypes.art_image_url` / `art_crop_url` via `refresh_archetype_art`, which resolves the already-chosen signature *card name* to a printing.

So one change to the selection logic corrects both. The signature-card *selection* (`_signature_card`) is unchanged.

## Goals / Non-Goals

**Goals:**
- Prefer a plain printing (no promo/crossover/borderless/showcase/extended/full-art/textless) over any special-treatment one, above recency and set type.
- Add a set-type preference tier: `expansion`/`core`/`masters` > neutral > `commander`/`draft_innovation`.
- Keep selection deterministic and offline-testable from bulk fixtures.
- Do not regress split/DFC resolution, miss behavior, or the paper-nonfoil gate.

**Non-Goals:**
- No schema change, no frontend change.
- No change to signature-*card* selection ranking (only which printing of that card is chosen).
- No new set-type exclusions beyond the existing `funny/memorabilia/token/alchemy` gate; `commander`/`draft_innovation` are demoted, not excluded (still eligible if no better printing exists).

## Decisions

**1. Broaden `_is_special_printing` to a treatment check.** Return true if any of: `promo` truthy; `promo_types` ∩ {`universesbeyond`}; `full_art` truthy; `textless` truthy; `border_color == "borderless"`; `frame_effects` ∩ {`showcase`, `extendedart`, `inverted`}. Explicitly do **not** test `border_color == "black"` — white/silver/gold borders stay eligible; only `borderless` demotes.

**2. Add a set-type tier helper.** Map `set_type` → `{expansion, core, masters} → 2`, `{commander, draft_innovation} → 0`, everything else → `1`.

**3. New `_selection_key` ordering (greater wins), plain treatment above everything:**
```
(
  1 if plain else 0,          # treatment: plain beats special (top priority)
  set_type_tier,              # 2 preferred / 1 neutral / 0 demoted
  released_at,                # most recent
  set code,                   # stable tiebreak
)
```

**4. Selection reads raw bulk rows, not the `Printing` dataclass.** `_is_special_printing` / set-type tier operate on the raw Scryfall row (which has `full_art`, `textless`, `border_color`, `frame_effects`, `set_type`) inside `from_bulk_rows`, so no new `Printing` fields are required. `Printing` stays as-is.

**5. Tests build indexes from small in-code bulk rows** (as existing tests do) covering: plain vs borderless same set; plain-old vs showcase-new (plain wins); full-art / textless demotion; white/gold border stays plain; expansion vs commander reprint; determinism regardless of row order. Assert the chosen `set_code`/`collector_number`/`image_url`.

## Risks / Trade-offs

- **Scryfall field names/values drift.** `frame_effects` tokens and `set_type` values are Scryfall vocabulary; if they add a new special frame effect we won't demote it until the list is extended. Acceptable — the common cases (showcase/extended/borderless/full-art/textless/promo) are covered, and misses degrade to "slightly fancy art," never to a wrong card.
- **A card available only as special-treatment** (e.g. a Secret Lair exclusive) still resolves to its least-bad printing rather than nulling — intended.
- **Existing rows are stale until remapped.** The fix only affects new scrapes until the one-time `--remap-scryfall` pass runs (`gh workflow run scrape.yml -f format=remap-scryfall`), which also refreshes archetype art. This is the documented standard post-merge step for resolver changes.
