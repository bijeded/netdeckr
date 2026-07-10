## 1. Event size in the label (shared helper)

- [ ] 1.1 Add `playerCount: number | null` to `EventOption` in `src/hooks/useMetagame.ts` and populate it at the `eventOptions.push` from `row.events?.player_count ?? null` (add a hook test asserting the option carries the size).
- [ ] 1.2 Add a `dashboard.eventSize` locale key (EN `{{count}} player`/`{{count}} players`, ES `{{count}} jugador`/`{{count}} jugadores`) to both locales; extend the locale-parity test.
- [ ] 1.3 Create a pure shared `eventLabel({ name, eventDate, playerCount }, lang, t)` helper (`src/lib/eventLabel.ts`) returning `name — date` (or just `name` when dateless) with ` (N players)` appended when `playerCount` is a positive number; write its tests first (with size, without size / null, zero → omitted, dateless, ES plural + singular).
- [ ] 1.4 Use the helper in `src/App.tsx` (replace the inline `eventLabel` const, so the plain caption and the `tierEventCaption` both pick up the size) and in `src/components/EventSelector.tsx` (each dropdown option), retiring the duplicated `name — date` assembly.

## 2. Verification

- [ ] 2.1 `npm run lint`, `npm run type-check`, `npm run test` all green (no regressions in App/EventSelector/caption tests).
- [ ] 2.2 Live read-only spot-check: selecting a sized event shows `… (N players)` in the caption and dropdown; an event with null `player_count` shows just name + date; the tier+event caption also carries the size.
