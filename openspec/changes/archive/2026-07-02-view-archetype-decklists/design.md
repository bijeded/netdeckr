## Context

MetaStack currently shows a per-(format, window) archetype breakdown backed by `formats`, `archetypes`, `metagame_snapshots`, and `format_window_freshness`. The daily GitHub Actions scraper reads MTGTop8 breakdown pages and writes via the service-role key; the browser reads directly from Supabase under RLS read-only. This change adds real decklists per archetype plus MTG Arena export.

Key existing constraints (from CLAUDE.md / HANDOFF):
- `meta_window` is a format-independent logical key; MTGTop8 `meta` IDs are per-format (`meta_id_for`/`WINDOW_META` in `scraper/mtgtop8.py`).
- Schema is manual (`supabase/schema.sql`, idempotent); applying it needs the service-role key (human/CI step). Reserved SQL keywords bite (`window` → `meta_window`).
- Scryfall bulk data is already synced daily; Arena export needs canonical name + current non-foil printing.
- Global CSS must be imported in `src/main.tsx`; tests stub `matchMedia`; scraper tests use fixtures only.

This spans schema + scraper + frontend, so per the handoff tip the shared contract lands as one change (task groups may still be separate PRs, but the schema+scraper contract stays together so `main` never breaks).

## Goals / Non-Goals

**Goals:**
- Store recent top-finish events, their decks, and deck cards in Supabase (RLS read-only), pruned under the existing 6-month policy.
- Expand an archetype card → recent deck rows → decklist modal (main/sideboard), faithful to the design prototype.
- MTG Arena export: clipboard for Standard/Pioneer, `.txt` download for Modern/Pauper/Pre-Modern, using Scryfall canonical names + current non-foil printing.
- Full ES/EN localization; card/archetype proper nouns stay English.

**Non-Goals:**
- No deck building/editing (export only — out of scope).
- No week-over-week deltas, top-cards/trending, or real card art (separate deferred changes).
- Storing the complete set of events/decks per (format, window) so later event/archetype filters have full data; display prefers top finishes, else latest 4.

## Decisions

### Data model: `events` / `decks` / `deck_cards`
- `events(id PK, source_event_id, format_code FK, name, event_date, unique(source_event_id, format_code))` — `source_event_id` is MTGTop8's `e` param; unique constraint makes upsert idempotent.
- `decks(id PK, event_id FK, archetype_id FK, player, placing, source_deck_id, unique(event_id, source_deck_id))` — `source_deck_id` is MTGTop8's `d` param.
- `deck_cards(id PK, deck_id FK, board CHECK in ('main','side'), quantity, card_name, scryfall_name, set_code, collector_number)` — `card_name` is the scraped name (always present); Scryfall fields nullable for fallback.
- Decks link to the **existing** `archetypes` table (get-or-create by name, matching current scraper behavior), so expansion reuses archetype identity/color pips.
- **Alternative considered:** a single denormalized decklist JSON column — rejected; normalized rows keep RLS/queries simple and let the frontend page cards cleanly.

### Deck selection scope + fallback
- The scraper stores the **complete** set of events and decks MTGTop8 lists per (format, window) — every event, all decks, all placings, with event date — respecting fair-use rate limiting and the 6-month retention prune. Storing everything (not a top-finish subset) is deliberate: the later event and archetype filters need the full data set, so we capture it now rather than re-scraping.
- Selection of what to *display* happens in the frontend/selector, not the scraper: for the expanded card, if the archetype has any **1st/2nd/Top 4** decks (placings 1, 2, 3–4) for the current (format, window), show those; otherwise fall back to the **latest 4 decklists by event date** (most recent first).
- **Alternative considered:** store only a top-finish subset — rejected; it would starve both the latest-4 fallback and the future filters.
- The frontend filters deck rows by the current (format, window) via the event/deck join, mirroring how the breakdown is already scoped.

### Card → Scryfall mapping for export (deferred to a separate change)
- There is **no** Scryfall sync in the repo today (CLAUDE.md describes one aspirationally). Building a Scryfall bulk-download + card index is its own subsystem, so it is split into a **separate change** and not part of this one.
- This change stores each deck card's **scraped name** and provides nullable `scryfall_name` / `set_code` / `collector_number` columns, left null for now. A later Scryfall-mapping change populates them (at scrape time, so the browser export stays pure string-formatting and honors Scryfall's no-client-bulk guideline).
- Until that change lands, MTG Arena export uses the scraped name via the same fallback path the export already needs for unmappable cards — so the export feature still works, just with less canonical names.
- **Alternative:** build the Scryfall sync inline here — rejected to keep this change scoped to the decklist data contract.

### Arena export delivery by format
- A small util builds the Arena text (`Deck` / `Sideboard` blocks, `"<qty> <name>"`). Delivery branches on format: `ST`/`PI` → clipboard (`navigator.clipboard.writeText`) + localized toast; `MO`/`PAU`/`PREM` → generate a Blob and trigger `.txt` download. The distinction reflects which formats MTG Arena actually supports.

### Frontend structure
- `ArchetypeCard` gains an expand/collapse state; expanded content is a deck-row list. Only rendered expandable when the archetype has decks (hide-until-data) — the decks hook reports which archetypes have decks for the current (format, window).
- New `DecklistModal` component (port modal styling from `design/`), new `useDecks`/selector hook shaping deck + card rows out of JSX (Recharts convention: shape data in hooks). New `arenaExport.ts` util. Strings added to `src/locales/es` + `en`.

## Risks / Trade-offs

- **Scrape volume / rate limiting** → Storing every event and deck per (format, window) is heavier; reuse respectful rate limiting, cache aggressively, and rely on the 6-month prune to cap total growth. Idempotent upsert means daily runs mostly touch new events, not re-fetch everything.
- **Scryfall name mismatches (split/adventure/DFC, promos)** → Store fallback `card_name`; export never fails. Log unmapped names for later tuning.
- **Schema deploy is a manual service-role step** → Ship schema + scraper together, keep `schema.sql` idempotent; after merge: apply SQL in Supabase editor, then `gh workflow run scrape.yml --ref main` to populate. Frontend degrades to hide-until-data if tables are empty, so `main` isn't broken pre-populate.
- **Modal accessibility** (focus trap, Escape, focus return) → Explicit acceptance criteria; test with jsdom (`matchMedia` already stubbed).
- **Clipboard API unavailable / blocked** → Confirmation reflects failure; consider `.txt` fallback if `writeText` rejects (handle in util).

## Migration Plan

1. Land schema + scraper + frontend in one change (task groups as separate PRs, schema+scraper contract together).
2. After merge to `main`: apply `supabase/schema.sql` via Supabase SQL editor (service-role), then `gh workflow run scrape.yml --ref main` to populate events/decks/deck_cards.
3. Frontend hides expansion until decks exist, so there is no broken intermediate state.
4. Rollback: revert the PR(s); new tables are additive and unused by prior features, so leaving them in place is also safe.

## Open Questions

- Whether MTGTop8's per-window event listing is fully enumerable in one pass or needs pagination — confirm during implementation so "every event for the window" is actually complete, not just the first page.
- Whether to show a card-count / validity hint in the modal (nice-to-have, not required by specs).
