## Context

See proposal.md — Why for the three defects and the evidence behind each.

The relevant machinery already exists and is not being restructured:

- `scraper/scryfall.py` builds a `name -> Printing` index from the bulk export. Eligibility is one predicate (`_is_paper_nonfoil`), ranking is one sort key (`_selection_key`) composed of `_is_special_printing` and `_set_type_tier`, and the index is built by bucketing rows under `row["name"]` then fanning each winner out to its face-name keys with `setdefault`.
- `scraper/run.py --remap-scryfall` re-resolves every distinct `card_name` in `deck_cards` against the current resolver and then calls `refresh_archetype_art` for each format, keeping card rows and archetype art in lockstep. A resolution miss is skipped rather than written, so a regression cannot null out good data.

So this change is a set of edits to three small predicates plus one operational run. The design questions are about *where* each fix belongs and how to bound the data churn — not about new components.

## Goals / Non-Goals

**Goals:**

- Make selection independent of bulk-file ordering in the cases where it currently is not.
- Keep the ranking a single total order that is cheap to reason about and testable from fixtures.
- Know the size and shape of the data diff before it reaches production.

**Non-Goals:**

- Reworking how the index is keyed or how face names are fanned out. The doubled-name bucketing is only a problem because `reversible_card` rows exist; rejecting them removes the symptom without touching the index structure. A general fix (bucketing by oracle id) is a larger change with its own risks and is not needed here.
- Changing the "newest wins" preference. It was considered and explicitly kept — see Decisions.
- Any frontend change. Trending Cards mis-sorts because the *data* is wrong; repaired data fixes it.

## Decisions

**Reject `reversible_card` at the eligibility gate, not via ranking.**
The alternative — leaving reversible rows eligible but demoting them — does not work, because the doubled name puts them in a different bucket where ranking never runs. Even if bucketing were fixed, a card whose only paper printing is reversible would still resolve to null `type_line`/`cmc`, which is the actual data defect. Rejection is absolute and belongs next to the existing digital/foil/joke-set rejections, where the same "this is not a real tournament printing" judgement already lives.

**Use `boosterfun` rather than collector-number heuristics to catch alternate treatments.**
`Aang's Iceberg` #336 is distinguishable from #5 by a high collector number, but collector-number thresholds vary per set and are not a documented contract. `boosterfun` is Scryfall's own vocabulary for exactly this concept — the alternate-treatment booster variants — and it is already present on every case we care about. It is additive to the existing markers, so cards where the current logic already works are unaffected.

**Drop `universesbeyond` rather than special-casing wholly-UB sets.**
Keeping it would mean asking "is this a UB card inside a non-UB set?", which requires set-level knowledge the row does not carry. Once `boosterfun` is in, the crossover *variants* the rule was written to catch are caught by their treatment markers instead, and the rule's only remaining effect is to flatten the ranking on UB sets into a total tie. Removing it strictly increases the number of cards that rank deterministically. The Universes Beyond scenario in the spec is retained but re-grounded on the promo/treatment markers.

**`masters` to neutral, `box` to demoted — and keep "newest wins".**
These were weighed together, because the set-type tier and the recency tiebreak interact. Making `masters` neutral is enough to knock Mystery Booster 2 out; it does not restore the original New Phyrexia art for `Torpor Orb`, because the plain `big` #27 expansion printing is newer and `big` is `set_type: expansion`. Reversing the date preference would restore it, but at the cost of returning 1993 art for staples across the board — a much worse default. Newest-plain-preferred-set is the accepted outcome; `big` is a printing Scryfall itself classifies as an expansion, so it is inside the intended definition. Demoting `box` is safe to apply to the whole set type: all 25 non-digital `box` sets are reprint/product boxes (Secret Lair ×3, Game Night, Guild Kits, Challenger Decks, Salvat, Beatdown …) with no set among them that should ever be a canonical art source. Demoted, not rejected — a card whose only printing is Secret Lair should still resolve.

**Measure the blast radius offline, before any write.**
A throwaway comparison script builds the index twice against the same cached bulk file — once with the old predicates, once with the new — and diffs the selected `(set_code, collector_number)` per name, intersected with the distinct `card_name` values actually present in `deck_cards`. This runs entirely offline against the cached download, costs one bulk parse, and turns "some art will change" into a reviewable list. It is a verification step, not a shipped artifact.

**Re-resolve with the existing `--remap-scryfall`.**
It already considers every distinct name (not just null rows), rewrites all Scryfall columns, skips misses, is idempotent, and refreshes archetype art afterwards. No new backfill path is warranted, and adding one would duplicate the miss-safety logic that makes remap safe to re-run.

## Risks / Trade-offs

- **Art changes for cards nobody complained about.** → The blast-radius diff is produced and reviewed before the remap runs; if it is far larger than expected, that is a signal the predicates over-reach and the change is reconsidered rather than shipped.
- **`Torpor Orb` still does not return New Phyrexia art.** → Accepted deliberately (see Decisions). If it turns out to be unacceptable, the lever is the date preference, which is a separate follow-up with a much wider blast radius.
- **Dropping `universesbeyond` could re-admit a genuine crossover variant** in a non-UB set that carries no promo, `boosterfun`, or frame-effect marker. → No such printing is known; the treatment markers are what actually distinguish variants, and a fixture-backed test covers the crossover case that motivated the original rule.
- **A card whose only printing is reversible now resolves as a miss** instead of resolving with null metadata. → This is the intended trade: a miss leaves the scraped `card_name` intact and the Scryfall columns null, which is the same end state as today for those columns, but without a bogus set/collector number and without polluting Trending Cards. Remap skips misses, so no existing good row is nulled.
- **Remap rewrites a large number of rows in one pass.** → It is an existing, idempotent, manually-triggered maintenance mode that pages its reads; it has been run before for exactly this class of change.

## Migration Plan

1. Land the resolver change with tests; CI stays green on `npm run lint`, `type-check`, `test`, and `pytest`.
2. Run the blast-radius comparison against the cached bulk file and review the diff.
3. Run `python scraper/run.py --remap-scryfall` (service-role, manual maintenance mode). This rewrites affected `deck_cards` rows and then refreshes archetype signature cards and art per format.
4. Verify the 166 null-`type_line` rows are resolved and that those cards no longer appear in Trending Spells; spot-check `Torpor Orb` and `Aang's Iceberg` art in the decklist modal.

**Rollback:** revert the resolver commit and re-run `--remap-scryfall`. Because remap re-resolves from the bulk file rather than from stored state, it restores the previous selection exactly; no snapshot is required.
