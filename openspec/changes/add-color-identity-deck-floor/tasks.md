## 1. Deck-count floor in color_identity_from_decks

- [ ] 1.1 Add a `COLOR_IDENTITY_MIN_DECK_COUNT` constant (=2) beside `COLOR_IDENTITY_MIN_DECK_SHARE` in `scraper/mtgtop8.py`, with a comment noting it's tunable and tests don't depend on the exact value (write the tests first).
- [ ] 1.2 Change the keep rule in `color_identity_from_decks` to `count >= max(COLOR_IDENTITY_MIN_DECK_SHARE * n, min(COLOR_IDENTITY_MIN_DECK_COUNT, n))`, and update the docstring to describe the share-and-floor rule and the deck-count cap.
- [ ] 1.3 Cover in tests: 2-deck archetype with a 1-deck splash → splash dropped, base kept; 1-deck archetype → its colors kept (not blanked); large field (e.g. n=10, splash in 4) → unchanged from the share-only result; no-decks / all-colorless → still "".

## 2. Verification

- [ ] 2.1 `cd scraper && ./venv/bin/pytest` green (no regressions in the existing color-identity tests).
- [ ] 2.2 Post-merge: run the one-time `--refresh-color-identity` pass (Actions `format=refresh-color-identity`, service-role) and spot-check live read-only that a previously-leaking small archetype (e.g. PAU Bogles) now reads without the splash pip, and that name-derived and large-archetype identities are unchanged.
