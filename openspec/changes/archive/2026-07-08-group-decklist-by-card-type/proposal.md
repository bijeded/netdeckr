## Why

The decklist modal renders the mainboard as one flat list, so reading a deck's composition (how many lands, creatures, spells) means scanning the whole column. Players — especially competitive ones sizing up an archetype — expect a decklist grouped by card type, the way every MTG client and deck site presents it. The data to do this (`deck_cards.type_line`) is already populated by the Scryfall mapping.

## What Changes

- The decklist modal's **mainboard** is split into four labelled, fixed-order sections: **Lands → Creatures → Spells → Other**, each with its own quantity count.
- Card classification (precedence order): a card whose `type_line` contains "Land" → **Lands**; else a card whose `type_line` contains "Creature" → **Creatures** (so an Artifact/Enchantment Creature counts as a Creature); else Instant/Sorcery/Enchantment → **Spells**; everything else (Artifact, Planeswalker, Battle, …) → **Other**.
- A card with a **null `type_line`** (Scryfall resolution miss, e.g. silver-border cards) falls into **Other** so nothing is hidden.
- **Empty categories are hidden** — a section heading only appears when it has at least one card.
- The **sideboard stays a single flat list** (unchanged), and **Arena export output is unchanged** (grouping is display-only).
- Section headings are **localized** (ES/EN) via react-i18next.
- `useDeckCards` adds `type_line` to its Supabase select and exposes it on `DeckCardLine`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-decklists-view`: the decklist modal's mainboard presentation gains a card-type grouping requirement (sideboard and export behavior unchanged).

## Impact

- Frontend only. No schema/scraper/dependency change (`deck_cards.type_line` already exists).
- `src/hooks/useDeckCards.ts` — select `type_line`, add to `DeckCardLine`.
- `src/components/DecklistModal.tsx` — group the mainboard by category before rendering.
- New pure classification helper (e.g. `src/lib/cardType.ts`) + tests.
- `src/locales/en.json` / `es.json` — four new `modal.*` group-heading keys.
