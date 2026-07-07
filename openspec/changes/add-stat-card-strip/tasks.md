## 1. Totals in the metagame hook

- [x] 1.1 Add `totals: { events: number; archetypes: number; decks: number }` to `useMetagame`, computed over the same window+event-filtered deck set that feeds `deriveBreakdown` (decks = count, archetypes = distinct names uncapped, events = distinct event ids).
- [x] 1.2 Return `totals`; reset it to zeros on the error/empty paths.
- [x] 1.3 Extend `useMetagame` tests: totals reflect the corpus (uncapped archetype count even beyond top-N), narrow under an event filter, and are zeroed on error/empty.

## 2. StatCard component

- [x] 2.1 Port `design/components/data/StatCard.jsx` to `src/components/StatCard.tsx` (typed `value`/`label`/`color?`/`style?`), right-aligned box with the design tokens; value in mono, uppercase micro-label.
- [x] 2.2 Add `stats.*` i18n keys (Events/Archetypes/Decks) to `src/locales/en` + `es`.
- [x] 2.3 Component tests: renders value + localized label; formats large numbers with thousands separators.

## 3. Render the strip in the header

- [ ] 3.1 Render the strip (Events · Archetypes · Decks) right-aligned in the header title row (`marginLeft:auto`), leaving the title, time-frame pill, and freshness unchanged.
- [ ] 3.2 Feed the strip from `useMetagame`'s `totals`; when an archetype filter is active, override with the isolated archetype's decks (Archetypes = 1, Decks = its deck count, Events = distinct events among them).
- [ ] 3.3 Format numbers with `toLocaleString()` (thousands separators).
- [ ] 3.4 App test: strip shows the totals; reflects an event filter; shows 1 archetype under an archetype filter; verify it doesn't disturb the existing header elements.

## 4. Verify

- [ ] 4.1 Run `npm run test`, `npm run type-check`, `npm run lint` — all green.
- [ ] 4.2 Manual read-only check against live Supabase: strip matches the window (Events/Archetypes/Decks), narrows under event + archetype filters, right-aligned per the design, ES/EN labels correct.
