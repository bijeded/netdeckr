# Proposal

## Why

The archetype-analysis requirement "Mana curve and card-type split" grew to a 659-character description when the doughnut moved to eight card types. It now states four behaviors in one block and fails `openspec validate --strict`. This change splits it without changing behavior.

## What Changes

- "Mana curve and card-type split" keeps the curve, the list of card types, the "other" fallback, and the rule that the stock list grouping is unchanged. All of its scenarios stay.
- The rule that each card counts once, by type precedence, moves to its own requirement.
- The rule that a type with no cards is left out of the split moves to its own requirement.
- No change to what the Analysis tab shows or how it behaves.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-analysis`: "Mana curve and card-type split" is narrowed to one behavior; its precedence and empty-type rules become two added requirements, with the same meaning.

## Impact

- `openspec/specs/archetype-analysis/spec.md` only, after sync.
- No code, test, data, Supabase, scraper, time-window, or retention change. Nothing user-visible.
