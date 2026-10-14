# Proposal

## Why

The dashboard shows what the metagame plays overall, but not how the newest cards are landing — the question players ask most right after a release. A "Top New Cards" table answers it from the same scraped decks, covering the two most recent main sets so it fills up even in the first days after a release, when few tournaments include the newest set.

## What Changes

- Add a fourth table, **Top New Cards**, beside Top Creatures, Top Spells, and Top Sideboard Cards: the top 10 cards printed in either of the two most recent main sets (today Reality Fracture `FRA` and The Hobbit `HOB`), ranked by total copies across **mainboard and sideboard combined**.
- A card counts if it is printed in either set at all — **reprints included** — regardless of which printing the app displays or exports.
- **Nonbasic lands are included**; basic lands (including snow basics and Wastes) are excluded. This differs from the other three tables, which exclude every land.
- Each row shows rank, card name, a set-code chip (`FRA` / `HOB`; the newer set when a card is in both), and total copies. No average-copies-per-deck column.
- The table respects the same time frame, sidebar filters, and banned-deck exclusion as the other tables.
- The table is **hidden in Pre-Modern**, whose card pool never receives new sets.
- The trending area changes from three columns to a **2x2 grid** on desktop (Creatures, Spells / Sideboard, New Cards), still stacking to one column on narrow widths.
- The pipeline derives, on every run, the two most recent main sets (`expansion` or `core`, released on or before the run date, paper) and the names of every card printed in them, from the Scryfall bulk data it already downloads.

## Capabilities

### New Capabilities
- `recent-main-sets`: identifying the two most recent main Magic sets and which cards are printed in them, stored for read-only use, and the copy-count aggregation of those cards over the scraped decks.

### Modified Capabilities
- `trending-cards-view`: adds the Top New Cards table, and replaces the three-up "Responsive trending layout" requirement with a 2x2 "Responsive trending grid".

## Impact

- **Supabase:** a new table holding the recent-set card lookup (anon read-only under RLS, written only by the service-role pipeline) and a new read-only aggregation RPC. Both are `schema.sql` changes, so this change carries an explicit migration task. Existing tables, `top_cards`, and their RLS policies are untouched.
- **Scraper:** the Scryfall step gains a derivation of the recent main sets and their card names from the existing daily bulk file, and each run rewrites the lookup table. No new network fetch, no change to MTGTop8 scraping or to deck-card enrichment.
- **Time windows and retention:** unchanged. The table uses the existing `7days`/`2weeks` windows; the lookup is rebuilt each run rather than retained.
- **Frontend:** the trending hook, the dashboard's trending section and its CSS, the shared table component, and ES/EN locale files. User-visible — merges only after Vercel preview confirmation.
- **Out of scope:** the existing preview-season issue where a reprint's displayed/exported printing can resolve to a not-yet-released set. This change does not depend on it, since membership is read from the lookup rather than from `deck_cards.set_code`.
