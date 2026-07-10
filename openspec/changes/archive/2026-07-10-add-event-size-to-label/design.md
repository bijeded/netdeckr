## Context

`events.player_count` (nullable tournament size, added for Power-Score weighting) is already selected by `useMetagame`'s deck query and used to build `twoWeekSizes`, but it is **not** surfaced on `EventOption` (which carries only `{ id, name, eventDate }`). The event label is assembled **twice, independently**: `App.tsx` builds `eventLabel = "{name} — {date}"` for the caption (and the tier+event caption), and `EventSelector.tsx` builds its own `"{name} — {date}"` for each `<option>`. Both call the shared `formatShortDate`.

## Goals / Non-Goals

**Goals:**
- Show the tournament size after the date, as a localized `(N players)` parenthetical, in both the caption and the dropdown options.
- Omit it cleanly when `player_count` is null (frequent).
- One source of truth for the event label so caption and dropdown never diverge.

**Non-Goals:**
- No schema/scraper change (the column and fetch already exist).
- No change to breakdown/share/filter behavior — this is label text only.
- No size shown for the "All events" default entry.

## Decisions

**1. Surface `playerCount` on `EventOption`.**
Add `playerCount: number | null` and set it at the existing `eventOptions.push` in `useMetagame` from `row.events?.player_count ?? null`. The event-options loop dedupes by id (first occurrence wins); `player_count` is constant per event, so first-occurrence is correct.

**2. One shared `eventLabel(event, lang, t)` helper.**
Extract a pure helper (e.g. `src/lib/eventLabel.ts`) that returns `"{name} — {date}"`, or just `"{name}"` when dateless, and appends `" (…)"` from `t('dashboard.eventSize', { count })` when `playerCount != null`. Both `App`'s caption and `EventSelector`'s options call it — retiring the duplicated assembly. It takes the display language (for `formatShortDate`) and `t` (for the size text); event name stays English.
- *Caption reuse:* `App`'s `eventLabel` const becomes a call to the helper; the tier+event caption already interpolates `eventLabel`, so the size flows into `tierEventCaption` for free.
- *Signature:* accept the minimal shape it needs (`{ name, eventDate, playerCount }`), so it's trivially unit-testable without constructing a full `EventOption`.

**3. Localized, count-aware size text.**
New key `dashboard.eventSize` with i18next plural forms: EN `"{{count}} player"` / `"{{count}} players"`, ES `"{{count}} jugador"` / `"{{count}} jugadores"`. The helper wraps it in parentheses with a leading space: `` `${name} — ${date} (${t('dashboard.eventSize', { count })})` ``. Keeping the parentheses in code (not the locale string) means the punctuation is uniform across locales and the locale value is just the noun phrase.

## Risks / Trade-offs

- **`player_count = 0`** (shouldn't happen for a real event) → `count: 0` would read "0 players". Treat only `!= null && > 0` as known, else omit — a defensive guard, cheap.
- **Long labels in the narrow sidebar `<select>`** → the parenthetical adds ~12 chars; native `<option>` truncates on its own and the caption line already wraps/ellipsizes. Acceptable; no layout change.

## Migration Plan

Pure frontend; ships with the merge (Vercel). No data step. Verified by unit tests + a quick live read-only check that a sized event shows "(N players)" and an unsized one doesn't.

## Open Questions

- None — separator (parenthetical), scope (caption + dropdown), and null handling are settled.
