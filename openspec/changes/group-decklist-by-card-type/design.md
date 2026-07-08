## Context

The decklist modal (`src/components/DecklistModal.tsx`) renders the mainboard as one flat list of `CardLine`s from `useDeckCards(deckId)`. The hook (`src/hooks/useDeckCards.ts`) reads `deck_cards` but does not currently select `type_line`, even though the column is populated by the Scryfall mapping (nullable on resolution misses). No schema, scraper, or dependency change is needed — this is a display-layer feature over data already present.

## Goals / Non-Goals

**Goals:**
- Group the mainboard into Lands / Creatures / Spells / Other, in that fixed order, each with a count.
- Deterministic, pure classification from `type_line`, unit-testable in isolation.
- Keep the sideboard flat and the Arena export byte-for-byte unchanged.
- Localized headings (ES/EN).

**Non-Goals:**
- No sideboard grouping (kept flat by decision).
- No mana-curve / stats visualization.
- No schema, scraper, or export-format change.
- No handling of type sub-ordering within a group (existing order within a category is preserved).

## Decisions

- **Classification helper** — a pure function in `src/lib/cardType.ts`, e.g. `cardCategory(typeLine: string | null): 'lands' | 'creatures' | 'spells' | 'other'`, with precedence: contains "Land" → lands; else contains "Creature" → creatures; else contains Instant/Sorcery/Enchantment → spells; else (including `null`/empty) → other. Case-insensitive substring match against the Scryfall type line (e.g. "Legendary Creature — Elf Druid"). A grouping helper `groupMainByType(lines)` returns the four buckets preserving input order within each.
- **Hook change** — add `type_line` to the select and expose `typeLine?: string | null` on `DeckCardLine`. Kept optional/nullable to mirror the other Scryfall fields.
- **Rendering** — in `DecklistModal`, replace the flat `main.map(...)` with iteration over the four categories, rendering a `SectionHeading` (reused) + the category's `CardLine`s, skipping empty categories. Each category heading shows the summed quantity via the existing `modal.cards` count string. The mainboard MAIN column header/count stays (overall main total). Categories render inside the existing `.decklist-main-cols` container so the multi-column CSS layout is preserved.
- **i18n keys** — `modal.group.lands`, `modal.group.creatures`, `modal.group.spells`, `modal.group.other` in both locales (English proper-noun-free labels: Lands/Creatures/Spells/Other; Spanish: Tierras/Criaturas/Hechizos/Otros).
- **Export untouched** — `buildArenaDeck(main, side, ...)` continues to receive the flat `main` array; only rendering regroups.

## Risks / Trade-offs

- **Multi-column layout across sections** — the current mainboard uses a CSS multi-column flow. Splitting into four heading+list blocks may interact with column balancing; mitigate by keeping headings `breakInside: avoid` and verifying layout in the browser. If multi-column looks broken per-section, fall back to a single-column grouped layout for the main board.
- **Null type_line prevalence** — most cards resolve; unresolved ones land in Other, which is acceptable and honest. No user-facing "unknown" label by decision.
- **Classification edge cases** (e.g. "Enchantment Creature", "Artifact Land") are covered by the precedence order and pinned with unit tests.
