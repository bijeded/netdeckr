## 1. Win count in the breakdown

- [x] 1.1 Add a `wins: number` field to `RankedArchetype` (and thus `ArchetypeShare`) in `src/lib/metagame.ts`.
- [x] 1.2 Tally `wins` per archetype in `deriveBreakdown`'s grouping loop via `placementBadge(deck.placement).kind === 'first'`; carry it through the mapped/ranked output.
- [x] 1.3 Extend `metagame` tests: wins counted only for 1st-place decks; count reflects the (filtered) input list; zero when no firsts.

## 2. WinTrophy component

- [x] 2.1 Build `src/components/WinTrophy.tsx`: renders nothing for `wins <= 0`, a bare 🏆 for `wins === 1`, and `🏆 ×N` (the `×N` in mono) for `wins > 1`, with a localized pluralized aria-label.
- [x] 2.2 Add pluralized `wins.label_one`/`wins.label_other` keys to `src/locales/en` + `es` (EN "{{count}} event win"/"wins"; ES "{{count}} victoria"/"victorias").
- [x] 2.3 Component tests: hidden at 0, bare trophy at 1, `×N` at >1, aria-label localized + count-aware in both locales.

## 3. Render on the archetype card

- [x] 3.1 Add a `wins?: number` prop (default 0) to `ArchetypeCard` and render `<WinTrophy>` inline after the name span in the `#rank · name` row, smaller font.
- [x] 3.2 Ensure the name still truncates with an ellipsis while the trophy stays fully visible (`flex-shrink: 0` on the trophy).
- [x] 3.3 Pass `archetype.wins` from `App.tsx` to `ArchetypeCard`.
- [x] 3.4 Card/App test: a card with wins shows the trophy after the name; a long-named card keeps the trophy visible.

## 4. Record the emoji exception

- [x] 4.1 Amend the `CLAUDE.md` design section: emoji disallowed *except* the 🏆 trophy, used solely to mark event wins.

## 5. Verify

- [x] 5.1 Run `npm run test`, `npm run type-check`, `npm run lint` — all green.
- [x] 5.2 Manual read-only check against live Supabase: trophies appear on archetypes with 1st-place decks, `×N` matches deck counts, correct under an event filter, ES/EN aria-labels correct.
