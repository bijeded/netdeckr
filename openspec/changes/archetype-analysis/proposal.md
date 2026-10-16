# Proposal

## Why

An archetype card answers "how popular is it" and "show me some lists", but not "what does this deck actually play, and how well does it do". Players who want to sleeve up an archetype today have to open lists one by one and average them in their head. An analysis view built on the scraped 2-week corpus gives them a stock list they can export and the numbers behind it.

## What Changes

- New **"Analysis →"** control next to "View all lists →" on an expanded grid card. It opens the isolated archetype view (`?a=`) directly on a new Analysis tab.
- The isolated archetype view gains a **Lists / Analysis** tab toggle in its recent-decklists header. The active tab is persisted in the URL (`&tab=analysis`; absent = Lists) so an analysis link is shareable and Back behaves natively.
- The Analysis tab always covers the **format's full Last 2 Weeks corpus, all events and event sizes**, regardless of the sidebar's time-frame, event-size, event, and tier filters. Banned-card exclusion still applies. The tab states its fixed scope; why the sidebar doesn't move it is left to the "How it works" page.
- Analysis sections:
  - **Stock list** — an averaged 60/15 decklist built from the archetype's decks (finish- and event-size-weighted inclusion, most common copy count per card, land count from the decks' median), rendered like a decklist (grouped list / image view) and exportable via the format's existing client export (MTG Arena for Standard/Pioneer, MTGO otherwise).
  - **Performance** — six headline stat cards (2-week share, tier, Power Score, top-8 rate, wins, decks), placement funnel, per-event-size breakdown, share per day.
  - **Composition** — consensus card table and sideboard plan (core / flex / spicy, inclusion %, average copies, 10 rows a page), mana curve, card-type split, and Arena wildcard cost (Arena formats only).
- Archetypes with fewer than 5 decks in the 2-week corpus show a "small sample" label on the stock list and composition sections rather than hiding them.
- Explicitly not included: per-player stats (top pilots) and matchup / win-rate data (MTGTop8 provides final standings only, not match results).

## Capabilities

### New Capabilities
- `archetype-analysis`: the Analysis tab's content and rules — fixed 2-week scope, stock list construction and export, performance and composition sections, small-sample handling, localization.

### Modified Capabilities
- `archetype-decklists-view`: the expanded card's recent-decklists header gains the "Analysis →" entry control, and the isolated view gains the Lists / Analysis tab toggle with its `tab` URL param and mobile layout.

## Impact

- **Supabase:** new read-only SQL function `archetype_card_stats` in `supabase/schema.sql`, granted to `anon`/`authenticated` like the existing RPCs; it reads `deck_cards`, `decks`, `events`, `banned_cards`. No table, column, or RLS policy changes. This is an explicit `schema.sql` migration and must be applied to the production database before the frontend ships.
- **Scraper / pipeline:** unaffected.
- **Time windows / retention:** the 7days/2weeks model and 30-day retention are unchanged. The analysis reuses the `2weeks` key and the preceding-window slice already loaded by the frontend.
- **Frontend:** archetype card header and isolated-view state (URL params, history), a new analysis tab and its data hook, reuse of decklist rendering and export helpers, new ES/EN strings. User-visible change, so it ships behind Vercel preview confirmation.
- **Blast radius:** limited to the expanded/isolated archetype card. The grid, filters, trending tables, and decklist modal behave as before.
