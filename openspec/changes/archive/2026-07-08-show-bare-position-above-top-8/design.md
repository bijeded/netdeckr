## Context

`placementBadge(placement)` in `src/lib/placement.ts` maps a raw MTGTop8 finish label to `{ label, kind }`. It parses all integers in the string; `low`/`high` are the first/last. The current final branch returns `{ label: \`Top ${high}\`, kind: 'other' }` for anything with `high > 4`, so a bare Swiss standing like "14" renders "Top 14". Both consumers (the archetype-card deck rows and the decklist modal) route through this one function, so a single edit covers both.

## Goals / Non-Goals

**Goals:**
- A bare integer standing above 8th renders the raw number (no "Top" prefix).
- Ranges (and integers ≤ 8) are unchanged.
- No change to `kind` (badge colour), i18n, schema, or scraper.

**Non-Goals:**
- No change to which decks are selected/shown, to the sort order, or to the Power Score (which reads raw placement, not the label).

## Decisions

- **Distinguish bare integer from range by parsed count**, not by `low === high`: `nums.length === 1` means the raw text held a single integer. Add one line before the existing final return:
  ```
  if (nums.length === 1 && high > 8) return { label: String(high), kind: 'other' }
  return { label: `Top ${high}`, kind: 'other' }
  ```
  `high` already equals that integer, so `String(high)` is the raw number. A range like "9-16" has `nums.length === 2`, so it falls through to `Top 16`.
- **Update the header comment** on `placement.ts` to describe the bare-integer-above-8 case (currently it only mentions "Top <n>").
- **Tests**: extend `placement.test.ts` with `"9" → 9`, `"14" → 14` (bare), and keep/confirm `"5-8" → Top 8`, `"9-16" → Top 16`, `"17-32" → Top 32` (ranges), plus a `"8" → Top 8` bare-boundary case.

## Risks / Trade-offs

- If MTGTop8 ever emits a deeper finish as a bare integer that a user *expects* to read as a bracket (e.g. "16" meaning the 9-16 bracket), it would now show "16" instead of "Top 16". This matches the stated intent (a lone integer is an individual standing), and real bracket data arrives as ranges ("9-16"), so the risk is negligible.
