# Design

## Context

See proposal.md (Why) for motivation and the `archetype-decklists-view` delta for the required text.

Current state:
- `src/lib/arenaExport.ts` builds the Arena text and decides delivery per format (`arenaDelivery`: clipboard for `ST`/`PI`, download otherwise); `arenaFilename` names the `.txt`.
- `src/components/DecklistModal.tsx` copies or downloads (Blob + anchor) based on that delivery.
- `src/hooks/useDeckCards.ts` already selects both `card_name` (scraped MTGTop8 name) and `scryfall_name` (canonical Scryfall name) but merges them into one `name` (`scryfall_name ?? card_name`).
- `deck_cards` stores no Scryfall `layout`, and its `type_line` describes only the played face, so neither column says whether a `" // "` name is a split card or a double-faced card.

Reference format: MTGGoldfish's MTGO-ready `.txt` downloads (Boros Energy, Modern Goblins) — bare `qty name` lines, CRLF, front-face names for double-faced cards (`Ajani, Nacatl Pariah`, `The Legend of Roku`), `Wear/Tear` for split cards, one blank line before the sideboard.

## Goals / Non-Goals

**Goals:**
- Produce MTGO text from data the modal already loads, with no schema, scraper, or backfill change.
- Keep the Arena output byte-for-byte unchanged.

**Non-Goals:**
- Exact-printing selection on MTGO. MTGO's text import cannot pin a printing; that needs a `.dek` file keyed by MTGO card IDs (`CatID`, Scryfall `mtgo_id`), which would need new stored data.
- An MTGO option for Standard/Pioneer, or a choice of client per format.

## Decisions

### 1. Tell split cards from other multi-face cards with the scraped MTGTop8 name

MTGTop8 writes a split card with both halves (`Fire / Ice`, the form `scraper/tests/test_scryfall.py` resolves) and a double-faced, modal double-faced, or adventure card by its front face only (`Fable of the Mirror-Breaker`, see `test_decklist_writer.py`). So for one card line:

```
scraped name contains "/"          --> split: halves joined by "/"     "Wear/Tear"
else canonical name has " // "     --> front face (text before " // ") "Ajani, Nacatl Pariah"
else                               --> canonical name, else scraped name
```

Halves come from the canonical name when present (canonical spelling), else from the scraped name; each half is trimmed.

Alternatives considered:
- **Store Scryfall `layout` on `deck_cards`.** Authoritative, but a schema change, scraper change, and backfill for one export string. Held in reserve if Decision 1 proves wrong (see Risks).
- **Infer from `type_line`.** Not possible: the stored type line is the played face's only, by spec.
- **Use the scraped name as-is.** Gets double-faced cards right, but writes split cards as `Fire / Ice` (MTGO expects `Fire/Ice`) and loses canonical spelling.

### 2. The hook exposes the scraped name alongside the merged name

`useDeckCards` keeps `name` (used for display and Arena) and adds the scraped name to each line, so the MTGO builder can apply Decision 1. No query change: `card_name` is already selected.

### 3. One export module, delivery replaced by target

`arenaExport.ts` becomes a deck-export module holding both builders and a format → target (`'arena' | 'mtgo'`) mapping that replaces `arenaDelivery`. `arenaFilename` and the modal's Blob/anchor branch are deleted: every format copies to the clipboard. Renaming the module (e.g. `deckExport.ts`) is part of this, since it no longer only concerns Arena.

### 4. CRLF line endings for MTGO text

Matches MTGO's own files and MTGGoldfish's MTGO download; MTGO runs on Windows. CRLF is safe whether or not the browser normalizes clipboard line endings on Windows. Not verified against the client itself (see Risks).

### 5. Copy

New key `modal.export.mtgo` — "Export to MTGO" / "Exportar a MTGO" (MTGO is a product name, unlocalized). `modal.export.download` and `modal.export.downloaded` are removed; `copied` and `error` are already client-neutral and are shared. The locale parity test keeps ES/EN in step.

Visual: the label is the only on-screen change. That it fits the button at mobile width in both locales was **pending visual confirmation** on the Vercel preview (it is shorter than the previous "Download Decklist" / "Descargar lista", which suggested no wrapping, but this was not measured). **Confirmed on the PR #208 preview (2026-10-13):** "Export to MTGO" / "Exportar a MTGO" fits the button at mobile and desktop width in EN and ES, and the list copied from a Boros Energy deck (double-faced Ajani, split Wear/Tear) matches the MTGGoldfish MTGO-ready shape when pasted into a text editor.

## Risks / Trade-offs

- [MTGO import is untested in the client] → Format copied from MTGGoldfish's MTGO-ready export; after release a user with MTGO imports one Modern, one Pauper, and one Pre-Modern list, including a double-faced and a split card.
- [MTGTop8 names a card differently than assumed — e.g. a split card by one half, or a double-faced card with a slash] → Unit tests pin the assumed forms; a wrong line shows up in the post-release import check. Fallback: store Scryfall `layout` (Decision 1 alternative).
- [Split-layout oddities — Rooms (`Bottomless Pool // Locker Room`), aftermath cards — whose MTGO spelling is unconfirmed] → They follow the split rule (`A/B`); rare in these formats. Adjust if the import check shows otherwise.
- [Removing the download breaks a habit for paper players who saved `.txt` files] → Pasting the clipboard into a text file or a deck site gives the same result; accepted as the cost of one action per format.

## Migration Plan

Frontend-only. Ships through a PR held for Vercel preview review (user-visible label and behavior change). Rollback: revert the PR; no data to migrate.

## Open Questions

- MTGO spelling of Room and aftermath cards — answerable from the post-release import check without changing the specs or approach.
