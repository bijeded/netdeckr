## Why

Deck rows (in the archetype card and the decklist modal) label a finish deeper than Top 8 as "Top {n}" (e.g. "Top 9", "Top 12", "Top 14"). For a bare individual Swiss standing that "Top" prefix is misleading — 14th place is just 14th, not a "Top 14" bracket. Showing the bare number for those finishes reads correctly, while true brackets (5-8, 9-16, 17-32) keep their "Top {upper}" label.

## What Changes

- The placement badge label drops the "Top " prefix **only for a bare integer standing above 8th** (e.g. `"9" → 9`, `"14" → 14`).
- **Range** placements are unchanged: `"5-8" → Top 8`, `"9-16" → Top 16`, `"17-32" → Top 32`. Bare integers 8th and better are unchanged (`"8" → Top 8`, and `1st`/`2nd`/`Top 4` as today).
- The badge `kind` (and therefore its colour) is unchanged — this is a label-only change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `archetype-decklists-view`: pin down the deck-row / modal placement-label format, so a bare standing beyond Top 8 shows the raw number while bracket ranges keep "Top {upper}".

## Impact

- Frontend only: `src/lib/placement.ts` (`placementBadge` final branch + header comment) and `src/lib/placement.test.ts` (add bare-integer cases; existing range cases stay valid).
- No schema, scraper, i18n, or badge-colour change. Placement labels stay English in both locales (competitive vocabulary, like MTG proper nouns).
