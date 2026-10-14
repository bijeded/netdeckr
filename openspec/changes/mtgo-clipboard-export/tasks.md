# Tasks

## 1. MTGO export text

- [ ] 1.1 Turn `src/lib/arenaExport.ts` into a deck-export module (design Decision 3): keep the Arena builder unchanged, add the MTGO builder (layout per "MTGO export text layout": card lines only, one empty line before a non-empty sideboard, CRLF, no headers or set codes) and MTGO naming per design Decision 1, replace `arenaDelivery` with a format → `'arena' | 'mtgo'` target, and delete `arenaFilename`. Move and extend `arenaExport.test.ts`; verify with `npm run test` that the existing Arena assertions still pass and new tests cover every "MTGO export text layout" and "MTGO card naming" scenario (double-faced front face, `Wear/Tear`, single-face, no-sideboard, unmapped card incl. `Fire / Ice` scraped split) and the target for all five formats.
- [ ] 1.2 Expose the scraped name on each line from `src/hooks/useDeckCards.ts` alongside the merged `name` (design Decision 2); verify `useDeckCards.test.tsx` asserts both names are returned and `name` is unchanged.

## 2. Modal export action and copy

- [ ] 2.1 Wire `DecklistModal.tsx` to the export target: every format copies to the clipboard (Arena text for `ST`/`PI`, MTGO text otherwise), remove the Blob/anchor download branch, and label the action `modal.export.action` or `modal.export.mtgo`. In `en.json`/`es.json` add `modal.export.mtgo` ("Export to MTGO" / "Exportar a MTGO") and remove `download` and `downloaded`. Verify `DecklistModal.test.tsx` covers the "Export a decklist to its client via the clipboard" scenarios (label per format, MTGO text written to the clipboard for a Modern deck, no download, confirmation, rejected-clipboard error) and that `npm run test`, `npm run lint`, and `npm run type-check` pass, including the locale parity test.

## 3. Preview and release

- [ ] 3.1 Open the PR and confirm on the Vercel preview: the MTGO label fits the button at mobile and desktop width in both locales (design Decision 5, pending visual confirmation), and the copied text from a Modern deck containing a double-faced and a split card, pasted into a text editor, matches the MTGGoldfish reference shape. Record the confirmed label fit in design.md.

## Workflow follow-up

- Merge only after the user confirms the Vercel preview (CLAUDE.md exception 1 — user-visible change).
- After release, a user with MTGO imports one Modern, one Pauper, and one Pre-Modern list (including a double-faced and a split card); fix any rejected line and resolve the design's Room/aftermath open question from the result.
- Run `/opsx:sync` and `/opsx:archive` once the import check passes.
