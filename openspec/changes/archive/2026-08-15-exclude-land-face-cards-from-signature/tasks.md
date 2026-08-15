## 1. Land-face signal on the resolved printing

- [x] 1.1 Add `has_land_face` to `Printing` in `scraper/scryfall.py`, computed in `_printing_for` from every face's type line (falling back to the row's top-level `type_line` when the row has no faces), with a comment stating it describes the whole card and is not a substitute for the per-face `type_line`
- [x] 1.2 Add resolver tests covering a spell-front/land-back MDFC resolved by front name, by back name, and by full `//` name (all true); a non-land MDFC (false); a plain land (true); a plain spell (false); and confirm `type_line` still returns the per-face line unchanged

## 2. Signature-card selection

- [x] 2.1 In `_signature_card` (`scraper/supabase_writer.py`), keep the per-row `type_line` land test and drop remaining land-faced names from the aggregated candidates by resolving each distinct name once; leave unresolvable names eligible, and keep the method working when no resolver is set
- [x] 2.2 Update the `_signature_card` and `refresh_archetype_art` docstrings to describe the any-face land rule instead of the `type_line` substring rule
- [x] 2.3 Add writer tests: a land-backed MDFC that would otherwise rank first is not chosen and the next eligible card wins; a non-land MDFC still wins; an archetype whose only candidates are land-faced leaves the art columns null; existing tie-break and unresolved-metadata behavior is unchanged

## 3. Verify

- [x] 3.1 Run `cd scraper && pytest` and `npm run lint` (no frontend or locale changes expected)
- [ ] 3.2 Open the PR, and before merging confirm on the Vercel preview that the archetype grid renders correctly and that Modern Belcher no longer shows Sea Gate Restoration art — this needs a pipeline run against the preview's data, so note in the PR if the corrected art is only observable after the next scheduled or dispatched run
