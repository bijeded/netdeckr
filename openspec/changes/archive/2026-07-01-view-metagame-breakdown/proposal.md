## Why

MetaStack currently has no user-facing functionality — it is a scaffold with an empty dashboard and an empty database. Players cannot yet see anything useful. This change delivers the first end-to-end vertical slice of real value: pick a Magic: The Gathering format and see its current metagame archetype breakdown, so players can decide what archetype to bring to an upcoming event or build a deck against the field. It also proves the full stack works (scrape → store → read → render) before we layer on filters, deltas, and deck lists.

## What Changes

- Introduce a **Supabase schema** for the minimum data this slice needs: formats, archetypes, and per-format "Last 2 Weeks" metagame snapshots (archetype share %, rank, color identity), plus a per-format last-updated timestamp. Public read-only via RLS.
- Add a **Python MTGTop8 scraper** that, for each of the 5 formats (Standard `ST`, Pioneer `PI`, Modern `MO`, Pauper `PAU`, Pre-Modern `PREM`), fetches the `meta=50` (Last 2 Weeks) archetype breakdown and upserts archetypes + share % + rank + color identity into Supabase, recording when the format was last updated. Wired to run in the existing daily GitHub Actions cron.
- Build the **dashboard breakdown view**: a default Standard format shows up to the **top 20** archetypes as cards (rank, English name, color-identity mana pips, placeholder gradient art, share % in mono one-decimal), sorted by share descending.
- Add **format switching** across the 5 formats, **persisted in the URL** (`?f=ST`) so the choice survives reload; Standard is the default when no format is in the URL.
- Add **loading (spinner)**, **empty (friendly frowny-face message)**, and **error (same friendly state)** states in the main window, plus an **"Updated X ago"** freshness indicator sourced from the format's last-updated timestamp.

Deferred to later changes (explicitly NOT in this slice): date/event-size/event/archetype filters; week-over-week delta (▲/▼); real Scryfall card art (placeholder gradient for now); expanded-archetype deck lists and the deck modal / MTG Arena export.

## Capabilities



### New Capabilities

- `metagame-data-pipeline`: the Supabase schema (formats, archetypes, metagame snapshots, freshness) and the MTGTop8 scraper that populates the Last 2 Weeks archetype breakdown for all five formats, run daily via GitHub Actions.
- `metagame-breakdown-view`: the dashboard that reads a format's stored archetype breakdown from Supabase and renders the ranked top-20 card grid, including format selection/persistence, the freshness indicator, and loading/empty/error states.



### Modified Capabilities



## Impact

- **Database (Supabase):** new tables (`formats`, `archetypes`, `metagame_snapshots` or equivalent) in `/supabase/schema.sql`; RLS read-only policies for the anon role.
- **Scraper (**`/scraper`**):** new parsing + upsert modules and the pipeline entry (`run.py`) that writes via the service-role key; new pytest fixtures (saved MTGTop8 HTML) and tests.
- **Frontend (**`/src`**):** new components (archetype card, mana pips, format switcher, states) ported from `design/`, a data hook reading Supabase, URL-param format state, and i18n strings (ES/EN) for all new UI copy.
- **CI / pipeline:** the daily GitHub Actions cron begins invoking the scraper; requires the already-configured `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` secrets.
- **Dependencies:** no new frontend deps beyond those already installed (React, Recharts unused here, supabase-js, i18next); scraper uses existing requests + BeautifulSoup4.

