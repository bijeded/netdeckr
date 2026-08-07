# Netdeckr

## Project overview
Responsive web dashboard for MTG metagames (Standard, Pioneer, Modern, Pauper, Pre-Modern) from real MTGTop8 tournament data — format + time-frame breakdown, archetype decklists with Arena export, trending cards. For pro and casual players (ES/EN), MTG Arena or paper. See `openspec/specs/` for living specs and `openspec/changes/archive/` for shipped changes.

## Platform
web (responsive)

## Stack
- Frontend: React 19 + Vite 8 + TypeScript 5.8
- Testing: Vitest + React Testing Library (`vitest.config.ts`, separate from `vite.config.ts`)
- Lint: oxlint
- Charts: Recharts
- i18n: react-i18next (ES/EN)
- Data access: @supabase/supabase-js (direct reads, RLS read-only)
- Database: Supabase (PostgreSQL)
- Scraper: Python 3.12 + requests + BeautifulSoup4
- Card data: Scryfall bulk data (daily)
- Pipeline: GitHub Actions (twice-daily cron, see Data pipeline)
- Hosting: Vercel

## Project structure
- `/src` — React app (components, pages, hooks, i18n, supabase client)
- `/src/components` — UI + chart components
- `/src/locales` — es / en translation files
- `/scraper` — Python scraper + Scryfall sync (own venv, requirements.txt)
- `/scraper/tests` — pytest tests with saved HTML fixtures
- `/supabase` — schema.sql and seed scripts
- `/.github/workflows` — CI + data pipeline
- `/public` — static assets

## Conventions
- File naming: React components PascalCase (`MetaChart.tsx`); hooks camelCase (`useMeta.ts`); Python snake_case (`scrape_event.py`)
- Component naming: PascalCase, one component per file
- Branch naming: task/[task-id]-[description]
- Commit format: follow the conventional commit format (see global CLAUDE.md)

## Test commands
- Frontend: `npm run test`
- Scraper: `cd scraper && pytest`
- Full suite: `npm run test && cd scraper && pytest`

## Key commands
- Install: `npm install` and `cd scraper && pip install -r requirements.txt`
- Dev server: `npm run dev`
- Build: `npm run build`

## Do not modify
- `/supabase/schema.sql` without an explicit migration task
- Scraper HTML fixtures under `/scraper/tests/fixtures` (regenerate deliberately)

## Environment variables
### Local (.env.local)
- VITE_SUPABASE_URL=
- VITE_SUPABASE_ANON_KEY=
### Production (Vercel + GitHub Actions secrets)
- VITE_SUPABASE_URL=            # Vercel
- VITE_SUPABASE_ANON_KEY=       # Vercel
- VITE_SENTRY_DSN=              # Vercel (optional — Sentry no-ops if unset)
- SUPABASE_SERVICE_ROLE_KEY=    # GitHub Actions (scraper writes)
- SUPABASE_URL=                 # GitHub Actions

## Deploy
- Platform: Vercel
- Production: auto-deploy on merge to main
- Staging: none
- Previews: auto per PR

## CI
- Runs on: every PR targeting main
- Runtime: Node 22, Python 3.12
- Commands: `npm run lint` | `npm run type-check` | `npm run test` | `cd scraper && pytest`
- Check name: `ci` — merge blocked if it fails

## Database
- Platform: Supabase (PostgreSQL)
- Migration: none — manual schema via `/supabase/schema.sql`
- Seed: `python scraper/run.py` (MTGTop8 + Scryfall)

## Data pipeline
- Schedule: GitHub Actions, per-format staggered crons, twice daily (~6 AM / 6 PM UTC-6, actual runs drift a few hours due to GitHub's cron delay). `workflow_dispatch` runs one format or `all`.
- Source: MTGTop8 (requests + BeautifulSoup4), base `http://mtgtop8.com`. Decklist scraping is incremental and paginates a window's full events list.
- Time windows: format-independent logical keys `7days`/`2weeks`. Frontend applies them as client-side date filters over decks and **derives the metagame breakdown from those decks** (no stored breakdown). Scraper resolves the logical keys to each format's own numeric MTGTop8 `meta` ID (`WINDOW_META`/`meta_id_for` in `scraper/mtgtop8.py`) and only fetches `2weeks` (superset of `7days`).
- Fair use: rate-limited, cached, no redistribution beyond derived stats
- Card data: Scryfall bulk sync once/day; hotlinked `image_uris`; Arena export uses latest non-foil printing
- Retention: data older than 30 days is pruned after each run

## Error tracking
- Platform: Sentry (`@sentry/react`), errors-only (no tracing/replay), loaded as a deferred async chunk (`src/lib/sentry.ts`); no-ops when `VITE_SENTRY_DSN` is unset (local dev, CI)

## Design
- Claude Design project: https://claude.ai/design/p/ada1f717-bbb1-4011-8f5a-e5b010ca9f60?file=Netdeckr.dc.html
- Reference in repo: `design/` (tokens, components, UI kit). Source of truth: `design/Netdeckr.dc.html` prototype — read `design/readme.md` first.
- **Vibe:** dark-mode competitive-gaming telemetry — near-black canvas, electric violet accent, dense and data-first. No emoji except 🏆 (event wins, `WinTrophy`); iconography otherwise `≡ ✕ ⬇ ▲ ▼ – ✓ → ←`.
- **Copy:** fully localized ES/EN via react-i18next, no hardcoded strings. MTG proper nouns (card/archetype names) stay in English in both locales.
- **Tokens** (`design/tokens/`): canvas `--bg-app #0a0b10`, cards `--surface-card #11121b`; accent `--neon-500 #b14bff → --neon-600 #7a2bff`; mana WUBRG pips as secondary accents; semantic up `#2fe6a0` / down `#ff5470` / flat `#ffcb45`; tiers T1 violet, T2 cyan, T3 neutral. Type: Sora (display), IBM Plex Sans (body), JetBrains Mono (all data — %, deltas, dates, ranks). Spacing 8/11/14/18/22px; sidebar 280px, topbar 62px, content max 1240px.
- **Components** (`design/components/`, `.jsx`+`.d.ts`+`.prompt.md`): `core/` Button, IconButton, Pill · `mana/` ManaPip(s) · `data/` TierBadge, ChangeIndicator, StatCard · `archetype/` ArchetypeCard. Port into `src/components/` as real React+TS.
- **Key screens** (`design/ui_kits/dashboard/`): topbar + 280px filter sidebar + header (StatCard strip) + archetype grid + trending table; plus expanded-archetype state and deck modal (main/sideboard + Arena export).

## Framework-specific review rules
- No secrets in the client bundle; only VITE_ anon key is exposed client-side
- All Supabase access from the browser must be RLS read-only; writes only via service-role in CI
- Recharts data shaped in hooks/selectors, not inside JSX
- All user-facing strings go through react-i18next (no hardcoded ES/EN text)
- Scraper tests must use saved fixtures, never hit live MTGTop8 in CI
- Respect Scryfall guidelines: hotlink images, no bulk re-hosting, cache bulk data
- Responsive: filter panel collapses on mobile; charts remain legible at small widths
- Any text or glyph rendered over card art sits on its own dark backdrop and clears 4.5:1 against it — the art is never the background a label is read against. Applies to every state, including the lowest tier.

## Workflow
OpenSpec only. Two flows are installed; default to the core one.

- **Core** — `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:sync` → `/opsx:archive`. Use it whenever the problem is known but the plan isn't; exploration is part of the default flow, not an advanced add-on.
- **Expanded** — adds `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive` for explicit scaffold-and-build control.

Two worth reaching for by name:
- `/opsx:ff` instead of `propose` when requirements are already clear — it creates the change and every artifact in one step.
- `/opsx:verify` before `/opsx:archive` on spec-heavy changes, to confirm the implementation matches the artifacts.

Skip `/opsx:explore` only when you already know exactly what you're building.
