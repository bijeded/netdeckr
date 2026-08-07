## 1. Resolver changes

- [x] 1.1 Reject `layout == "reversible_card"` in `_is_paper_nonfoil` (`scraper/scryfall.py`), alongside the existing digital / non-paper / excluded-set-type / foil-only rejections
- [x] 1.2 Add `boosterfun` (in `promo_types`) to `_is_special_printing`
- [x] 1.3 Remove the `universesbeyond` check from `_is_special_printing`
- [x] 1.4 Move `masters` out of `_PREFERRED_SET_TYPES` so it falls to the neutral tier
- [x] 1.5 Add `box` to `_DEMOTED_SET_TYPES`
- [x] 1.6 Update the module docstring and the `_is_special_printing` / `_set_type_tier` / `_selection_key` docstrings to describe the new eligibility rule and ranking

## 2. Tests

- [x] 2.1 Add a test that a card with both a plain and a `reversible_card` printing resolves to the plain one with non-null `type_line`/`cmc`, asserted with the reversible row placed both before and after the plain row so bulk-file ordering is ruled out
- [x] 2.2 Add a test that a card whose only printing is `reversible_card` resolves to a miss
- [x] 2.3 Add a test that a plain printing beats a `boosterfun` printing in the same set with the same release date (the `Aang's Iceberg` shape)
- [x] 2.4 Add a test that on a wholly-Universes-Beyond set the plain printing wins, and update or replace the existing test asserting `universesbeyond` alone makes a printing special
- [x] 2.5 Add a test that a plain `expansion` printing beats a newer plain `masters` printing (the `Torpor Orb` shape), and update the existing preferred-set-type test that treats `masters` as preferred
- [x] 2.6 Add a test that a `box` printing loses to a preferred-set printing but is still selected when it is the only eligible printing
- [x] 2.7 Run `cd scraper && pytest` and confirm the full suite passes
- [x] 2.8 Regenerate the Scryfall bulk fixture with a real M11 Lightning Bolt printing (approved deliberate fixture change): with `masters` neutral, the fixture's only metadata-carrying Bolt printing (`clu`, Ravnica: Clue Edition) is no longer selected, so a preferred-tier printing carrying metadata was needed

## 3. Blast-radius measurement

- [x] 3.1 Write a throwaway comparison script (scratchpad, not committed) that builds the index from the cached bulk file under both the old and new predicates and diffs the selected `(set_code, collector_number)` per card name
- [x] 3.2 Intersect the diff with the distinct `card_name` values present in `deck_cards` and report the count plus a sample of changed cards
- [x] 3.3 Review the diff — confirm the null-`type_line` names are covered and that the remaining changes look like intended art improvements, not collateral

Measured against the cached `default_cards-2026-08-06` bulk file (116,687 rows) and the
3,505 distinct `card_name` values in `deck_cards`:

| Outcome | All names | In `deck_cards` |
|---|---|---|
| Selected printing changes | 7,248 | 1,318 |
| Newly resolving | 0 | 0 |
| Became a miss | 64 | **0** |
| Null `type_line` repaired | 12 | 5 |

- The 5 repaired names are exactly the 5 distinct names behind the 168 broken rows in production (`Clarion Conqueror`, `Magmatic Hellkite`, `Marang River Regent`, `Norin the Wary`, `Reckoner Bankbuster`) — all now resolve with a real type line and cmc.
- No card the site actually uses becomes a miss. The 64 misses are almost all doubled `X // X` keys that nothing resolves by, plus a few cards (e.g. `Anje Falkenrath`) whose only non-reversible printings are memorabilia or foil-only.
- The 1,318 changes are dominated by the `masters` demotion pulling selections off The List (`PLST`), Mystery Booster 2 (`MB2`), Double Masters (`2X2`), Remastered (`INR`), and Commander Masters (`CMM`) back onto the original expansion printing — the intended effect.
- Both reported cards land correctly: `Torpor Orb` → `BIG 27`, `Aang's Iceberg` → `TLA 5`.

## 4. Ship and re-resolve

- [ ] 4.1 Open the PR on a `task/`-prefixed branch and confirm CI (`lint`, `type-check`, `test`, `pytest`) is green
- [ ] 4.2 After merge, run `python scraper/run.py --remap-scryfall` with service-role credentials; it re-resolves `deck_cards` and refreshes archetype signature cards and art per format
- [ ] 4.3 Verify no `deck_cards` rows remain with a null `type_line` for a name that resolves, and that the previously-affected cards no longer appear in Trending Spells
- [ ] 4.4 Spot-check `Torpor Orb` and `Aang's Iceberg` art in the decklist modal on production, and confirm archetype art still renders
