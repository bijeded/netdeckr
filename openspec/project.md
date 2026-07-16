# Netdeckr

## Purpose
Netdeckr tracks Magic: The Gathering metagames across Standard, Pioneer, Modern, Pauper, and Pre-Modern using real tournament data from MTGTop8. It exists to give players a fast, filterable view of what decks are winning, which cards are trending, and lets them export any decklist straight into MTG Arena.

## Users
- Professional MTG players — deep metagame analysis, archetype breakdowns, trends over multiple time windows.
- Casual MTG players (ES/EN) — quick "what should I play" answers and easy Arena export.
- Both play on MTG Arena or in paper events.

## Stack
- Frontend: React 18 + Vite + TypeScript, Recharts, react-i18next
- Data: Supabase (PostgreSQL), read directly from the browser via RLS read-only
- Scraper: Python 3.12 + requests + BeautifulSoup4
- Card data: Scryfall bulk data (daily)
- Pipeline: GitHub Actions daily cron
- Hosting: Vercel

## Architecture
- Data pipeline (Python, GitHub Actions cron): scrapes MTGTop8 formats/events/decklists/top-cards (following every page of a window's events list), syncs Scryfall bulk data, writes to Supabase using the service-role key, and prunes any data older than 30 days at the end of each run.
- Database (Supabase/Postgres): normalized tables for formats, events, decks, cards, and archetypes (each format stamped with a per-format `last_updated_at`); RLS grants public read-only. There is no stored metagame breakdown — the share per archetype is derived at read time from the decks.
- Frontend (React SPA on Vercel): reads directly from Supabase, applies format and time-frame filters (event/archetype filters planned), **derives the metagame breakdown from the window's decks** (grouped by archetype), renders metagame + trending charts, shows decklist pop-ups with MTG Arena export. The time windows (`5days`/`2weeks`) are format-independent logical keys applied as client-side date filters over the decks; the scraper reuses them only to resolve each format's per-format MTGTop8 meta ID.
- Boundary: browser is strictly read-only; all writes happen in CI. No secrets beyond the Supabase anon key reach the client.

## Conventions
- React components PascalCase; hooks camelCase; Python snake_case.
- Branch: task/[task-id]-[description]; commits: [task-id]: [imperative description].
- All UI text via react-i18next (ES/EN); no hardcoded strings.
- Scraper tests use saved HTML fixtures; never hit the live site in CI.

## Out of scope
- No user accounts, login, or personalization in v1 (all data is public/read-only).
- No deck building/editing — export only.
- No formats beyond the five listed.
- No mobile-native app (responsive web only).
- No paid features, ads, or monetization.
- No redistribution of raw MTGTop8 data — only derived metagame statistics.
- No staging environment.
- No long-term historical archive — data older than 30 days is deleted, not retained.
