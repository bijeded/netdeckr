## 1. Card-type classification helper

- [x] 1.1 Write tests for `src/lib/cardType.ts`: `cardCategory(typeLine)` precedence (Land beats Creature beats Instant/Sorcery/Enchantment beats Other; null/empty → Other; edge cases: "Legendary Creature", "Artifact Creature", "Enchantment Creature", "Artifact Land", "Basic Land", "Battle", "Planeswalker", "Instant", "Sorcery", "Enchantment").
- [x] 1.2 Implement `cardType.ts` (`cardCategory` + `groupMainByType` preserving input order within each bucket) to pass the tests.

## 2. Data layer

- [x] 2.1 Add `type_line` to the `useDeckCards` Supabase select and expose `typeLine?: string | null` on `DeckCardLine`; update/adjust `useDeckCards` tests for the new field.

## 3. Modal rendering + i18n

- [x] 3.1 Add `modal.group.lands|creatures|spells|other` keys to `src/locales/en.json` and `es.json` (EN: Lands/Creatures/Spells/Other; ES: Tierras/Criaturas/Hechizos/Otros); extend the locale-parity test.
- [x] 3.2 Update `DecklistModal` to group the mainboard via `groupMainByType`, rendering a localized `SectionHeading` + count per non-empty category in fixed order, keeping the sideboard flat and export unchanged; add/extend `DecklistModal` tests (grouping, empty-category hiding, null→Other, sideboard flat, export unchanged).

## 4. Verify

- [x] 4.1 Run `npm run lint`, `npm run type-check`, `npm run test`; verify the grouped mainboard in the browser (multi-column layout intact) across a land-heavy and a creatureless deck.
