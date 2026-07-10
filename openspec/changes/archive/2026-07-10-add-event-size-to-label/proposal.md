## Why

Since tournament size (`events.player_count`) is now stored and already fetched, the event label can show how big the event actually was — a meaningful signal the dashboard otherwise hides. The header StatCard "Decks" count is only how many decklists *we scraped* (MTGTop8 lists the top cut), so the real field size is genuinely new, complementary information.

## What Changes

- Append the tournament size to the **selected-event caption** and to the **Event-filter dropdown options**, after the date, as a parenthetical: e.g. `Standard Challenge — 24 Jun 2026 (128 players)`.
- Combine with the tier caption when both are active: `Tier 1 — Standard Challenge — 24 Jun 2026 (128 players)`.
- **Gracefully omit** the size when `player_count` is null (many events lack it) — the label falls back to the current `name — date`.
- Localize the size ("players" / "jugadores", count-aware plural); event names stay English (proper nouns).
- Introduce a **single shared `eventLabel` helper** (name + abbreviated date + optional `(N players)`) used by **both** the `App` caption and the `EventSelector` dropdown, retiring the current duplicated label assembly so the format lives in one place.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: the Event filter's dropdown entries and the selected-event caption additionally show the tournament size (player count) when known, appended after the date as a localized parenthetical, omitted when unknown.

## Impact

- **Frontend only.** No schema, scraper, or dependency change — `events.player_count` already exists and is already fetched by `useMetagame`.
- `src/hooks/useMetagame.ts` — add `playerCount: number | null` to `EventOption`, populated at the event-options build.
- New shared `eventLabel` helper (+ a `dashboard.eventSize` locale key, count-plural, ES/EN).
- `src/App.tsx` (caption) and `src/components/EventSelector.tsx` (dropdown) both call the helper.
- Tests: helper with/without size + pluralization, hook exposes `playerCount`, locale parity.
