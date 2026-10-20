# Proposal

## Why

The Analysis tab's card-type doughnut reuses the decklist's four display groups (lands, creatures, spells, other), which lumps artifacts, enchantments, instants, and sorceries together and hides planeswalkers and battles under "other". A player reading an archetype's composition wants the actual card types. Separately, the Spanish sideboard-plan heading says "Plan de banquillo", a literal translation no Spanish-speaking player uses; the rest of the Spanish UI already says "Sideboard".

## What Changes

- The Analysis tab's card-type split SHALL break the stock list mainboard into eight card types — lands, creatures, planeswalkers, battles, artifacts, enchantments, instants, sorceries — plus an "other" fallback for cards whose type line is unresolved. Each card counts once, by a fixed precedence (Land > Creature > Planeswalker > Battle > Artifact > Enchantment > Instant > Sorcery > Other), so the split still sums to the mainboard size.
- Kindred (formerly Tribal) gets no slice of its own: it always accompanies another card type, which classifies the card.
- The decklist type grouping (Lands / Creatures / Spells / Other) used by the decklist modal and the stock list's sections is **unchanged**, as are the mana curve's and stock list's land classification.
- Spanish copy: the sideboard plan heading changes from "Plan de banquillo" to "Plan de sideboard". English is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-analysis`: the "Mana curve and card-type split" requirement changes the split from the decklist's four groups to eight card types with an unresolved-type fallback.

## Impact

- Analysis tab composition rail (card-type doughnut and its legend) and the analysis selectors that shape its data.
- ES and EN locale files: new card-type labels; one Spanish heading reworded.
- No change to the decklist modal, stock list grouping, Arena/MTGO export, mana curve, or wildcard cost.
- No Supabase table, RLS, scraper, time-window, or retention change — `type_line` is already loaded for the stock list.
- User-visible: the PR waits for confirmation on the Vercel preview before merge.
