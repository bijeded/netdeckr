## 1. Schema + scraper: decklist data contract (one PR — shared contract)

- [x] 1.1 Add `events`, `decks`, `deck_cards` tables to `supabase/schema.sql` with FKs to `formats`/`archetypes`, uniqueness for idempotent upsert (`events(source_event_id, format_code)`, `decks(event_id, source_deck_id)`), `board` CHECK (`main`/`side`), and nullable Scryfall fields; validate SQL locally with sqlglot
- [x] 1.2 Add RLS anon SELECT-only policies for the three new tables (no anon writes)
- [x] 1.3 Extend the 6-month prune to delete events (cascading decks/deck_cards) older than 6 months
- [x] 1.4 Add MTGTop8 event-list + decklist page parsing in `scraper/mtgtop8.py` (enumerate every event for each format+window incl. pagination if any; store all decks with parsed placing — all finishes — and event date for the latest-4 fallback and future filters: player, placing, archetype, main/side cards) — tests first against new saved fixtures
- [x] 1.5 Store scraped card names in `deck_cards`; leave the Scryfall columns null (Scryfall bulk-sync + mapping is a separate change — see design.md; export falls back to scraped names until it lands)
- [x] 1.6 Idempotent upsert of events/decks/deck_cards (get-or-create archetypes as today); re-run does not duplicate — tested
- [x] 1.7 Wire decklist scraping into `scraper/run.py` daily flow; run `cd scraper && ./venv/bin/pytest`

## 1b. Pipeline performance: incremental + staggered per-format scraping (one PR — follow-up to group 1)

- [x] 1b.1 Add `existing_event_ids(fmt)` to the writer (GET events?format_code=eq.&select=source_event_id → set) — tested
- [x] 1b.2 Make `sync_decklists` incremental: accept a set of known event ids and skip those events entirely (no results/deck fetches) — tested (skipped vs new)
- [x] 1b.3 Make `run.py` accept an optional format arg (`python scraper/run.py ST`) to scrape one format; default = all — tested
- [x] 1b.4 Rewrite `.github/workflows/scrape.yml`: 5 staggered crons mapped to formats via `github.event.schedule`, `workflow_dispatch` input for a single format or all, per-format concurrency group, and a higher `timeout-minutes` for the first backfill
- [x] 1b.5 Run `cd scraper && ./venv/bin/pytest`; verify the workflow scrapes one format per schedule

## 2. Frontend: read decks + expand archetype (one PR)

- [x] 2.1 Add a `useDecks`/selector hook that reads decks + deck_cards for the current (format, window) via Supabase, shaping deck rows (placing, player, event name+date, archetype color identity) outside JSX, and applying the display rule per archetype: show 1st/2nd/Top 4 decks, else fall back to the latest 4 by event date — tested (both branches)
- [x] 2.2 Expose which archetypes have ≥1 deck for the current (format, window) so cards render expandable only when data exists (hide-until-data)
- [x] 2.3 Add expand/collapse state to `ArchetypeCard`; expanded content renders the deck-row list with color pips; clicking again collapses — tested
- [x] 2.4 Deck rows re-query on format/window change; card collapses when no decks match — tested
- [x] 2.5 Add ES/EN strings for deck-row labels (placing/result, player, event/date); verify no hardcoded text

## 2b. Frontend: ArchetypeCard design polish to match the prototype (one PR — before task 3)

- [x] 2b.1 Add `tierFor(pct)` lib + `TierBadge` component (T1/T2/T3/Otros per design thresholds/tokens) — tested
- [x] 2b.2 Add `placementBadge(placement)` helper mapping raw finishes to design labels (1st/2nd/Top 4/Top N) + a color kind — tested
- [x] 2b.3 Collapsed card: show the tier badge (top-right of the art) and render the rank as `#N` (skip the ARTE placeholder label) — tested
- [x] 2b.4 Expanded state: span full width (`grid-column: 1 / -1`) and lay decks out as a grid of deck cards (position badge + pips, player, event, date + localized `ver deck`/`go to deck` CTA) — tested
- [x] 2b.5 Expanded header shows `ÚLTIMOS DECKS · <archetype>` + a localized `N listas`/`N lists` count
- [x] 2b.6 Add ES/EN strings (`decks.heading` with archetype, `decks.count`, `decks.viewDeck`); no hardcoded text; MTG proper nouns stay English

## 2c. Frontend: DeckCard design refinements (one PR — follow-up to 2b)

- [x] 2c.1 Expanded header reverts to `Recent decklists`/`Listas recientes` (no archetype name)
- [x] 2c.2 Shrink deck cards (min 160px) and widen the grid gap; fix crowding/overlap (`min-width: 0`)
- [x] 2c.3 Remove the redundant color pips from the deck card; right-align the position badge
- [x] 2c.4 Add a subtle hover lift to the deck card (CSS `.deck-card:hover` translateY)
- [x] 2c.5 Make the whole deck card a button (modal open wired in task 3)
- [x] 2c.6 Localize the fringe tier label: `Otros` (ES) / `Rogue` (EN)

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
