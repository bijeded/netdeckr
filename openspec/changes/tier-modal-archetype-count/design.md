## Context

See proposal.md — Why.

`FilterModal` is deliberately generic: it renders the rows it is handed and knows nothing about events, archetypes, or tiers. A row today is `{ key, value, content, aside?, meta? }`, laid out as three cells:

```
[ content ........................ ][ aside ][ meta ]
```

`aside` (the tier-badge column in the Archetypes modal) is reserved list-wide — as soon as any row uses it, every row renders the cell, so empty ones still align. `meta` is not reserved; it renders per-row and collapses when absent. That difference matters here: adding a second figure column must not make the Events and Archetypes modals render an extra empty cell.

The tier rows are built in `App.tsx` from two sources already in hand for the current view: `breakdown` (one entry per archetype, each carrying its tier) and `fullDecksByArchetype`. Both figures are therefore pure client-side derivations of data already loaded — the archetype count is `breakdown` filtered by tier, and the deck count is the existing sum, unchanged.

## Goals / Non-Goals

**Goals:**

- Keep column alignment the responsibility of `FilterModal`, not of the call site. If `App.tsx` composed two spans into one `meta`, each row would size its own figures and the columns would not line up.
- Leave the Events and Archetypes modals byte-identical in rendered output.
- Keep the deck column exactly where it is today, so the Tiers modal grows leftward rather than shifting a figure the user already knows the position of.

**Non-Goals:**

- Extending the second figure column to the Events or Archetypes modals. The capability lands in the shared component; only the tier rows exercise it.
- Reconciling the pre-existing formatting mismatch between StatCard numbers (`toLocaleString`, thousands separators) and modal figures (raw `{{count}}`). Real but out of scope — flagged for a separate change.

## Decisions

**A second named field, not an overloaded `meta`.** The row shape gains a distinct optional field for the archetype figure, rendered in its own cell to the left of `meta`, and reserved list-wide by the same "any row uses it" rule that already governs `aside`. Considered and rejected: (a) `meta?: string | [string, string]` — a union that every consumer would have to narrow, for one call site; (b) widening `meta` to `ReactNode` and letting `App.tsx` compose the two spans — cheapest diff, but it moves column sizing to the call site and defeats the alignment this change exists to provide.

**Archetypes left, decks right.** Matches the header StatCard strip's left-to-right order (Events, Archetypes, Decks) and goes coarser-to-finer. It also leaves the deck column in place.

**Separate columns rather than a `·`-joined string.** `·` is the established separator for joining peer facts elsewhere in the app (the decklist modal's `player · event · date`), so a joined string would have been idiomatic — but it is one cell containing two facts, and where each figure lands then depends on the width of whatever precedes the dot. Superseded during exploration in favour of two cells, on the user's call, because alignment down the list is the point.

**Two count-aware i18n keys, no composed string.** The archetype figure gets its own `_one`/`_other` pair alongside the existing `deckCount`, in both locales. Because the figures are now separate cells, no separator or joining key is needed — which is also why the earlier idea of a composed `"{{archetypes}} · {{decks}}"` key is no longer required.

**Column widths settled on the preview.** The archetype cell holds strings like `31 archetypes` / `31 arquetipos` (~13 characters) against the deck cell's `131 decks` / `131 mazos` (~9). A minimum width per cell in the same monospace face at the same size is the mechanism. Confirmed on the Vercel preview at desktop and mobile widths: the archetype cell's 88px holds, the two figure cells and the tier label coexist on one line at mobile width, and no row wraps. Two adjustments came out of that review:

- **Separation.** The row's own 11px gap read as too tight for two figures in *different* units — they ran together as one number. A further 14px on the archetype cell separates them without loosening the label-to-figure spacing everywhere else.
- **Headroom for four digits.** The deck cell's 58px fits `131 decks` but not a four-digit count. A row reaching the thousands would widen its own cell and push the archetype column left on that row alone, breaking exactly the alignment this change is for. The deck cell reserves 76px — but only when a second column sits beside it (`.filter-modal-row-meta-secondary + .filter-modal-row-meta`), since a single-figure modal has nothing to its left to knock out of line. That scoping is what keeps the Events and Archetypes modals unchanged.

Four digits is the ceiling worth reserving: the 30-day retention window bounds a format's deck count well below five.

## Risks / Trade-offs

- **The row wraps or crowds on narrow viewports** (two figure cells added beside a short tier label) → the spec requires no second line on narrow viewports; settled on the Vercel preview, with cell minimum widths or the figure font size as the adjustment. Not assertable from local reasoning.
- **A regression leaks into the Events or Archetypes modals** via the shared component → the new cell renders only when a row supplies the field, and the existing `FilterModal.test.tsx` and `App.test.tsx` cases for those two modals are the guard; they must pass unmodified.
- **The two totals invite a false expectation** that the tier archetype counts sum to the Decks card's number → they sum to the *Archetypes* card's number instead. This is intended (the Decks card's own figure still reconciles with the deck column) but is a genuine readability trade-off of showing two units under one card, and is why both figures stay explicitly unit-labelled rather than being reduced to bare numerals.
- **Longer Spanish plurals** (`arquetipos`) set the column width in both locales if a single shared minimum is used → acceptable; the alternative, per-locale widths, would be worse than a few pixels of slack in English.

## Migration Plan

Not applicable — presentation-only, no data or schema involvement. Rollback is reverting the commit; nothing persists.
