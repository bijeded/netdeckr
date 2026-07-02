## Why

The metagame breakdown tells players *which* archetypes are winning, but not *how* to build or play them. Players still have to leave MetaStack and hunt down decklists elsewhere, and casual Arena players have no way to get a list into their client. Surfacing real recent decklists per archetype — with a one-click MTG Arena export — completes the core "what should I play, and give me the list" loop that is central to the app's purpose.

## What Changes

- Expand an `ArchetypeCard` in the breakdown to reveal a list of that archetype's recent top-finishing decklists (placing/result, player name, event name + date, color pips) for the current format + time window.
- Only archetypes that have stored decklists for the current (format, window) show an expand affordance (hide-until-data).
- Click a deck row to open a decklist modal showing mainboard and sideboard as separate sections with card quantities and names.
- Export the decklist to MTG Arena:
  - **Standard / Pioneer** (Arena-supported): copy Arena-format text to the clipboard with a localized confirmation.
  - **Modern / Pauper / Pre-Modern** (not on Arena): download a `.txt` file in the same list format.
  - Card lines prefer each card's Scryfall canonical English name and current non-foil set + collector number when available, falling back to the scraped name. (Scryfall mapping itself is a **separate change**; until it lands, exports use scraped names via the fallback path.)
- Extend the daily pipeline to scrape every MTGTop8 event and all of its individual decklists per (format, window), storing them in new `events`, `decks`, and `deck_cards` tables (RLS read-only for the browser), and add a 6-month retention prune for these tables (no prune existed before).

## Capabilities

### New Capabilities
- `archetype-decklists-view`: Frontend behavior for expanding an archetype into its recent decklists, the decklist modal (main/sideboard), and MTG Arena export (clipboard vs `.txt` by format).

### Modified Capabilities
- `metagame-data-pipeline`: The scraper now also fetches events and individual decklists, maps cards to Scryfall printings, stores `events`/`decks`/`deck_cards`, and prunes them under the existing 6-month retention.

## Impact

- **Schema** (`supabase/schema.sql`): new `events`, `decks`, `deck_cards` tables + RLS read-only policies; retention prune extended.
- **Scraper** (`scraper/`): new MTGTop8 event + decklist page parsing, Scryfall card-name/printing mapping for Arena export, upsert + prune logic.
- **Frontend** (`src/`): `ArchetypeCard` expand state, deck-row list, new decklist modal component, Arena-export util, new hook/selector to read decks, ES/EN strings.
- **Data volume**: more rows and daily scrape work; respect MTGTop8 fair-use rate limiting.
- No new client secrets; browser stays RLS read-only. No deck editing (export only) — consistent with out-of-scope.
