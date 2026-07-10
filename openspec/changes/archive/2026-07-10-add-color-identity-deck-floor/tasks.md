## 1. Deck-count floor in color_identity_from_decks

- [x] 1.1 Add a `COLOR_IDENTITY_MIN_DECK_COUNT` constant (=2) beside `COLOR_IDENTITY_MIN_DECK_SHARE` in `scraper/mtgtop8.py`, with a comment noting it's tunable and tests don't depend on the exact value (write the tests first).
- [x] 1.2 Change the keep rule in `color_identity_from_decks` to `count >= max(COLOR_IDENTITY_MIN_DECK_SHARE * n, min(COLOR_IDENTITY_MIN_DECK_COUNT, n))`, and update the docstring to describe the share-and-floor rule and the deck-count cap.
- [x] 1.3 Cover in tests: 2-deck archetype with a 1-deck splash → splash dropped, base kept; 1-deck archetype → its colors kept (not blanked); large field (e.g. n=10, splash in 4) → unchanged from the share-only result; no-decks / all-colorless → still "".

## 2. Verification

- [x] 2.1 `cd scraper && ./venv/bin/pytest` green (no regressions in the existing color-identity tests).
- [x] 2.2 Post-merge: run the one-time `--refresh-color-identity` pass (Actions `format=refresh-color-identity`, service-role) and spot-check live read-only. **Done (2026-07-10):** refresh run succeeded; no regressions (PI Arclight Phoenix UR, PAU Affinity UBR unchanged; gray counts sane, no over-blanking). **Finding:** the PAU Bogles → WUG example was a **misdiagnosis** — it is a hybrid-mana color-identity artifact (Slippery Bogle is `{G/U}`, so blue is in the Scryfall color identity of a card in *every* deck), NOT a small-sample splash, so the deck-count floor correctly leaves it WUG. The floor still delivers its spec for genuine single-deck splashes (unit-tested). Hybrid-mana WUG is accepted as-is (no follow-up recorded, per decision).
