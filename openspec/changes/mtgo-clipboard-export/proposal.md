# Proposal

## Why

Modern, Pauper, and Pre-Modern are Magic Online (MTGO) formats, but their decklist export downloads a `.txt` in MTG Arena syntax — an `About`/`Name` block, a `Deck` header, `(SET) NUM` suffixes, and full `Front // Back` names for multi-face cards — none of which matches what MTGO's importer reads. MTGO can import a decklist pasted from the clipboard, so these formats can get the same one-click copy that Standard and Pioneer already have, provided the copied text is in MTGO's own syntax.

## What Changes

- The decklist modal's export action for Modern, Pauper, and Pre-Modern decks copies an MTGO-compatible decklist to the clipboard, labeled "Export to MTGO" / "Exportar a MTGO", with the same localized confirmation and error messages as the Arena export.
- The MTGO text matches the shape of MTGGoldfish's MTGO-ready `.txt` export: one `"<quantity> <card name>"` line per card, mainboard first, one blank line, then the sideboard; no deck-name block, no section headers, no set codes or collector numbers; CRLF line endings.
- MTGO card naming: a double-faced, modal double-faced, or adventure card is written by its front face only (`Ajani, Nacatl Pariah`); a split card joins its halves with a single unspaced slash (`Wear/Tear`); a card without a Scryfall mapping falls back to its scraped name in the same naming.
- **BREAKING (user-facing):** the `.txt` file download for Modern, Pauper, and Pre-Modern is removed; no format downloads a file any longer.
- Standard and Pioneer are unchanged: Arena text copied to the clipboard under "Export to MTG Arena".

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `archetype-decklists-view`: the "Export a decklist to MTG Arena" requirement becomes an Arena-or-MTGO export — the Modern/Pauper/Pre-Modern file download is replaced by an MTGO-syntax clipboard copy with its own label, and MTGO naming and layout rules are specified.

## Impact

- **Frontend:** the decklist modal's export action and its label, the export text builder, the deck-cards hook (the MTGO naming needs the scraped name alongside the canonical one), and the ES/EN locale strings (MTGO label added; download label and download confirmation removed).
- **User-visible:** yes — the export button's label and behavior change for three of the five formats. Ships behind Vercel preview review.
- **Supabase / RLS:** none. `deck_cards.card_name` and `scryfall_name` are already read by the modal; no schema, table, or policy change.
- **Scraper / pipeline:** none.
- **Time windows / retention:** no change to the `7days`/`2weeks` model or the 30-day retention window.
- **Verification gap:** no one on the team runs MTGO, so compatibility is established against MTGGoldfish's MTGO-ready export format, not the client itself; a real MTGO import is checked after release.
