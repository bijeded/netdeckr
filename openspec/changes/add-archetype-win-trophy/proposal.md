## Why

An archetype card shows popularity (share %), performance tier, and window momentum, but nothing marks the most visceral competitive fact: **it actually won a tournament**. A 🏆 with a win count gives players an immediate "these decks take down events" read that the abstract Power-Score tier does not convey at a glance.

## What Changes

- Add a **win trophy** to the archetype card: a 🏆 shown when the archetype has ≥1 first-place deck in the current filtered view, with a **×N multiplier** when it has more than one (bare 🏆 for exactly one).
- Compute the **win count** in `deriveBreakdown` from the same window/event-filtered deck list that drives the share, so the trophy tracks the active filters automatically (under an event filter, only the winner's card shows a bare 🏆).
- Render the trophy **inline after the archetype name** in the `#rank · name` row, in a smaller font; the name keeps its ellipsis truncation while the trophy stays pinned.
- Introduce a small reusable **`WinTrophy`** component (takes a win count) so the trophy treatment is consistent and reusable elsewhere.
- Add a localized, pluralized aria-label so the mark is accessible (EN "{{count}} event win/wins", ES "{{count}} victoria/victorias"). No tooltip.
- **Record a deliberate design exception:** emoji remain disallowed *except* the 🏆 trophy, used solely to mark event wins. Amend the design guidance (`CLAUDE.md` design section) and note it in the spec so it is not read as an oversight.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: adds a requirement for the win-trophy indicator (derived win count, bare-vs-multiplier rule, placement after the name, localized accessible label, and the scoped emoji exception).

## Impact

- Frontend only. `src/lib/metagame.ts` (`RankedArchetype`/`ArchetypeShare` gain a `wins` count; `deriveBreakdown` computes it via `placementBadge(...).kind === 'first'`). New `src/components/WinTrophy.tsx` + test. `src/components/ArchetypeCard.tsx` renders it in the name row (new `wins` prop). New pluralized `wins.*` i18n keys in `src/locales/es` + `en`.
- Design-doc amendment in `CLAUDE.md` (scoped emoji exception).
- No schema, scraper, or dependency change; the placement data already exists on every deck. Power-Score tiers are unchanged (they already fold 1st places in; the trophy is additive signal).
