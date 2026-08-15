## Why

A scraped MTGTop8 card name identifies a single **face**, but the Scryfall index maps that name to a whole **card** and stores the whole card's metadata. Two user-visible defects follow from that one mismatch:

- **Wrong card.** Pre-Modern's `Replenish` (Urza's Destiny, a sorcery) resolves to `Eiganjo Dynastorian // Replenish` (SOC) — a different card that merely has a face by that name — so the site shows the wrong name, art, printing, and Arena export line.
- **Wrong type.** `Esper Origins` resolves correctly to the FIN transform card, but its stored type line is the combined `"Sorcery // Enchantment Creature — Saga Elemental"`. A substring test for "Creature" matches, so a sorcery is listed in Top Creatures.

Both are live in production today, in the two places players read most: Trending Cards and the decklist modal.

## What Changes

- Name resolution gains a **priority rule**: a name that is a whole Scryfall card's name, or a multi-face card's front-face name, SHALL beat a name that only appears as some other card's non-front face. Today the winner is whichever printing the bulk file happened to reach first.
- The persisted `type_line` becomes the **matched face's** type line rather than the whole card's combined line. `Esper Origins` stores `"Sorcery"`; `Eiganjo Dynastorian` stores `"Creature — Fox Advisor"`.
- Creature/spell/land classification — in the `top_cards` RPC and in the client's card grouping — reads that single-face line. No consumer changes its rule; the input stops being two type lines glued together.
- **BREAKING (behavioral, not schema):** modal DFC lands are reclassified. `Agadeem's Awakening // Agadeem, the Undercrypt` stores `"Sorcery — Arcane"` and becomes eligible for Top Spells and grouped under Spells in the decklist modal, where today the combined line's "Land" excluded and grouped it. This is the deliberate consequence of one consistent rule — the scraped name is the front face, and the front face is what you cast from hand.
- Existing `deck_cards` rows are rewritten via the existing `run.py --remap-scryfall` mode. The code fix alone changes nothing users see: the wrong `scryfall_name` and `type_line` are already persisted, and would otherwise linger until 30-day retention ages them out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scryfall-card-mapping`: resolution priority when a scraped name is both a card name and another card's face name; `type_line` (and the identity columns it travels with) describe the matched face, not the whole card.
- `trending-cards-view`: the creature/spell/land split is defined against the matched face's type line, so a multi-face card is classified by the face the deck actually plays.
- `archetype-decklists-view`: the same single-face basis for the modal's Lands/Creatures/Spells/Other grouping and the image view's land-last ordering.

## Impact

**Scraper** — `scraper/scryfall.py`: the name-key index construction and the `Printing` record's type line. `scraper/supabase_writer.py` writes the resulting value through the scrape path and all three maintenance passes; no new write path is introduced.

**Database** — `supabase/schema.sql`: the `top_cards` function's `category` expression and its land-exclusion predicate change behavior without changing text, because their input narrows. No table, column, or RLS policy changes; `deck_cards.type_line` keeps its type and nullability, only its meaning narrows.

**Frontend** — `src/lib/cardType.ts` (`cardCategory`) and the decklist modal's list and image views: same situation, behavior follows the data. `src/hooks/useTrendingCards.ts` and `src/lib/trendingCards.ts` consume the RPC's `category` unchanged.

**Also downstream of `type_line`** — archetype signature-card selection excludes lands by type line, so a modal DFC becomes eligible as a signature card (and therefore as archetype art).

**Production data** — one manual `python scraper/run.py --remap-scryfall` run after merge, a full-table rewrite of `deck_cards` identity and metadata columns. It is an existing, idempotent mode; this change does not add tooling for it.

**Unaffected** — the 7days/2weeks window model, the 30-day retention window, the scrape schedule, and banned-card matching (which joins on `scryfall_name`; correcting a mis-resolved name can only make that join more accurate).

**Blast radius** — every format, but concentrated in Pre-Modern (the `Replenish` collision) and in Standard/Pioneer (modal DFCs and recent multi-face cards). User-visible in Top Creatures, Top Spells, the decklist modal, and Arena export, so it needs Vercel preview confirmation before merge.
