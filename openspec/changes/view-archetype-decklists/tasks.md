## 1. Schema + scraper: decklist data contract (one PR — shared contract)

- [ ] 1.1 Add `events`, `decks`, `deck_cards` tables to `supabase/schema.sql` with FKs to `formats`/`archetypes`, uniqueness for idempotent upsert (`events(source_event_id, format_code)`, `decks(event_id, source_deck_id)`), `board` CHECK (`main`/`side`), and nullable Scryfall fields; validate SQL locally with sqlglot
- [ ] 1.2 Add RLS anon SELECT-only policies for the three new tables (no anon writes)
- [ ] 1.3 Extend the 6-month prune to delete events (cascading decks/deck_cards) older than 6 months
- [ ] 1.4 Add MTGTop8 event-list + decklist page parsing in `scraper/mtgtop8.py` (enumerate every event for each format+window incl. pagination if any; store all decks with parsed placing — all finishes — and event date for the latest-4 fallback and future filters: player, placing, archetype, main/side cards) — tests first against new saved fixtures
- [ ] 1.5 Store scraped card names in `deck_cards`; leave the Scryfall columns null (Scryfall bulk-sync + mapping is a separate change — see design.md; export falls back to scraped names until it lands)
- [ ] 1.6 Idempotent upsert of events/decks/deck_cards (get-or-create archetypes as today); re-run does not duplicate — tested
- [ ] 1.7 Wire decklist scraping into `scraper/run.py` daily flow; run `cd scraper && ./venv/bin/pytest`

## 2. Frontend: read decks + expand archetype (one PR)

- [ ] 2.1 Add a `useDecks`/selector hook that reads decks + deck_cards for the current (format, window) via Supabase, shaping deck rows (placing, player, event name+date, archetype color identity) outside JSX, and applying the display rule per archetype: show 1st/2nd/Top 4 decks, else fall back to the latest 4 by event date — tested (both branches)
- [ ] 2.2 Expose which archetypes have ≥1 deck for the current (format, window) so cards render expandable only when data exists (hide-until-data)
- [ ] 2.3 Add expand/collapse state to `ArchetypeCard`; expanded content renders the deck-row list with color pips; clicking again collapses — tested
- [ ] 2.4 Deck rows re-query on format/window change; card collapses when no decks match — tested
- [ ] 2.5 Add ES/EN strings for deck-row labels (placing/result, player, event/date); verify no hardcoded text

## 3. Frontend: decklist modal (one PR)

- [ ] 3.1 Create `DecklistModal` component (port modal styling from `design/`) rendering mainboard + sideboard sections with quantities and names, opened from a deck row — tests first
- [ ] 3.2 Dismiss on Escape / close control / backdrop; return focus to the triggering deck row (matchMedia already stubbed in tests) — tested
- [ ] 3.3 Ensure main/sideboard remain legible and scrollable on narrow viewports (responsive CSS in `src/styles/`)
- [ ] 3.4 Add ES/EN strings for modal headings and controls

## 4. Frontend: MTG Arena export (one PR)

- [ ] 4.1 Add `arenaExport.ts` util building Arena text (`Deck`/`Sideboard`, `"<qty> <name>"`) from deck cards, preferring Scryfall canonical name + non-foil printing when present and falling back to the scraped name otherwise (Scryfall columns may be null until the separate Scryfall change lands) — unit-tested
- [ ] 4.2 Standard/Pioneer: copy to clipboard with a localized confirmation; handle clipboard failure gracefully — tested
- [ ] 4.3 Modern/Pauper/Pre-Modern: generate a `.txt` Blob download instead of clipboard — tested
- [ ] 4.4 Wire the export action into `DecklistModal`, choosing delivery by format; add ES/EN strings for the action + confirmation

## 5. Verify + wrap up

- [ ] 5.1 Run full suite: `npm run lint && npm run type-check && npm run test && cd scraper && ./venv/bin/pytest`
- [ ] 5.2 After merge: apply `supabase/schema.sql` (service-role) then `gh workflow run scrape.yml --ref main`; verify decks appear via anon read
- [ ] 5.3 `/opsx:sync` deltas into `openspec/specs/` and `/opsx:archive` the change (via a `chore:` PR)
