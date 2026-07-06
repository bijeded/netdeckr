## Context

Archetype cards render from `ArchetypeShare` (produced by `deriveBreakdown` + `attachPowerTiers` in `src/lib/metagame.ts`). `deriveBreakdown` already groups the window/event-filtered decks by archetype and keeps a `count`; every deck carries a raw MTGTop8 `placement` label, and `placementBadge(placement).kind === 'first'` already identifies a 1st-place finish. So the win count is a one-loop addition at the exact point the share is computed — no new query, no schema change, and it inherits the active filters for free.

The card's header is a fixed layout: overlay corners (mana pips top-left; trend arrow + tier badge top-right) over the art, then a `#rank · name` row and the share % below. The trophy goes in the name row, per the agreed mockup.

## Goals / Non-Goals

**Goals:**
- Mark archetypes that won ≥1 event with a 🏆, plus a `×N` multiplier for >1, derived from the filtered view.
- A small reusable `WinTrophy` component so the trophy treatment is consistent and reusable.
- Accessible (localized, count-aware aria-label) and layout-safe (name still ellipsizes).

**Non-Goals:**
- No tooltip, no hover detail.
- No change to Power-Score tiers (they already fold in 1st places; the trophy is additive).
- No schema/scraper/dependency change; no broader emoji usage — the exception is scoped to the trophy only.

## Decisions

**1. Compute `wins` in `deriveBreakdown`, carried on `RankedArchetype`/`ArchetypeShare`.**
Add a `wins: number` field, tallied in the same grouping loop via `placementBadge(deck.placement).kind === 'first'`. This guarantees the count matches the displayed share exactly (same filtered `DeckForBreakdown` list) and is pure/unit-testable. Alternative — counting from the card's `decksByArchetype` — was rejected: that list is capped at 6, so a hot archetype with 7+ Top-4 finishes could undercount its wins.

**2. A dedicated `WinTrophy` component.**
`WinTrophy({ wins }: { wins: number })` renders nothing when `wins <= 0`, a bare `🏆` when `wins === 1`, and `🏆 ×N` when `wins > 1` (the `×N` in the mono font, per the numbers-are-mono convention). It owns the localized aria-label. Making it a component (not inline JSX) satisfies the "reusable elsewhere" intent and keeps the aria/pluralization logic in one place. `ArchetypeCard` gains a `wins?: number` prop (default 0) and renders `<WinTrophy>` after the name span.

**3. Layout: trophy pinned, name ellipsizes.**
In the `#rank · name` flex row, the name span keeps `overflow:hidden / text-overflow:ellipsis / white-space:nowrap` and flexes; the `WinTrophy` is a sibling with `flex-shrink: 0` so it stays fully visible while the name truncates. Font is smaller than the name (e.g. `var(--fs-2xs)`).

**4. Emoji exception, recorded.**
The project design rule is "no emoji." The 🏆 is a deliberate exception, limited to marking wins. Record it in two places so it is not mistaken for an oversight (and so the code-review skill's design check accounts for it): a one-line amendment to the `CLAUDE.md` design section, and the spec requirement text.

**5. i18n via pluralized keys.**
`wins.label_one` / `wins.label_other` with a `{{count}}` interpolation — EN "{{count}} event win" / "{{count}} event wins", ES "{{count}} victoria" / "{{count}} victorias". Only the aria-label is translated; the 🏆 and `×N` are universal.

## Risks / Trade-offs

- **Emoji rendering varies by platform** (Apple gold vs. Google flat vs. Windows) → accepted deliberately by the product owner; scoped to the single trophy glyph.
- **Name-row crowding on very long names** → mitigated by `flex-shrink:0` on the trophy + ellipsis on the name; the trophy is short (`🏆 ×N`).
- **Redundancy with tier** → intentional; the trophy is a more visceral, literal signal than the Power-Score tier and was chosen as additive.

## Migration Plan

Pure additive frontend change, single PR (disciplined task groups). No data migration; rollback = revert.

## Open Questions

None — behavior, placement, copy, and the emoji exception are all decided.
