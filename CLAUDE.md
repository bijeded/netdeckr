# MetaStack

## Project overview
MetaStack is a responsive web dashboard for tracking Magic: The Gathering metagames across Standard, Pioneer, Modern, Pauper, and Pre-Modern, using real tournament data from MTGTop8. Users pick a format and a time frame (Last 5 Days / 2 Weeks / 2 Months) to explore the metagame; planned filters (event, archetype) and features (archetype decklists, trending/top cards, MTG Arena export) extend from there. Built for professional and casual players (Spanish and English), playing on MTG Arena or in paper events.

Shipped so far: format switcher, the metagame archetype breakdown, and the time-frame filter (in a filter sidebar). See `openspec/specs/` for living specs and `openspec/changes/archive/` for completed changes.

## Platform
web (responsive)

## Stack
- Frontend: React 19 + Vite 8 + TypeScript 5.8
- Testing: Vitest + React Testing Library (config in `vitest.config.ts`, separate from `vite.config.ts`)
- Lint: oxlint
- Charts: Recharts
- i18n: react-i18next (ES/EN)
- Data access: @supabase/supabase-js (direct reads, RLS read-only)
- Database: Supabase (PostgreSQL)
- Scraper: Python 3.12 + requests + BeautifulSoup4
- Card data: Scryfall bulk data (daily)
- Pipeline: GitHub Actions (daily cron)
- Hosting: Vercel

## Project structure
- `/src` — React app (components, pages, hooks, i18n, supabase client)
- `/src/components` — UI + chart components
- `/src/locales` — es / en translation files
- `/scraper` — Python scraper + Scryfall sync (own venv, requirements.txt)
- `/scraper/tests` — pytest tests with saved HTML fixtures
- `/supabase` — schema.sql and seed scripts
- `/.github/workflows` — CI + daily data pipeline
- `/public` — static assets

## Conventions
- File naming: React components PascalCase (`MetaChart.tsx`); hooks camelCase (`useMeta.ts`); Python snake_case (`scrape_event.py`)
- Component naming: PascalCase, one component per file
- Branch naming: task/[task-id]-[description]
- Commit format: [task-id]: [imperative description]

## Test commands
- Unit/integration (frontend): `npm run test`
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
- SUPABASE_SERVICE_ROLE_KEY=    # GitHub Actions (scraper writes)
- SUPABASE_URL=                 # GitHub Actions

## Deploy
- Platform: Vercel
- Production deploy: triggered automatically on merge to main
- Staging deploy: none — no staging environment
- Preview environments: YES — auto-generated per PR

## CI
- Runs on: every PR targeting main
- Runtime: Node 22, Python 3.12
- Commands: `npm run lint` | `npm run type-check` | `npm run test` | `cd scraper && pytest`
- Check name (branch protection context): `ci`
- Merge blocked if CI fails: YES

## Database
- Platform: Supabase (PostgreSQL)
- Migration command: none — manual schema via `/supabase/schema.sql` for now
- Seed command: `python scraper/run.py` (populates from MTGTop8 + Scryfall)

## Data pipeline
- Schedule: GitHub Actions daily, one job per format on staggered crons (12:00–13:00 UTC, 15 min apart); `workflow_dispatch` can run a single format or `all`. Decklist scraping is incremental (events already stored are skipped), so only the first backfill is slow.
- Source: MTGTop8 (requests + BeautifulSoup4), base `http://mtgtop8.com`
- Time windows: stored as format-independent logical keys `5days`, `2weeks`, `2months` (the three windows MTGTop8 offers with the same meaning for every format). **MTGTop8's numeric `meta` param is per-format** — the same window has a different ID per format — so the scraper maps each logical window to that format's ID via `WINDOW_META`/`meta_id_for` in `scraper/mtgtop8.py`. The non-universal "Large Events" / "MTGO/Live" windows were intentionally dropped (Pre-Modern lacks Large Events; MTGO is "Live Tournaments"/3mo elsewhere).
- Fair use: respectful rate limiting, cache aggressively, no redistribution beyond derived metagame stats
- Card data: Scryfall bulk download once/day; hotlink `image_uris`; Arena export uses current/latest non-foil set printing, no special art
- Retention: data older than 6 months is not kept — the daily job prunes events (and their decks/snapshots) older than 6 months from Supabase after each run

## Error tracking
- Platform: none (v1) — Sentry candidate later

## Design
- Claude Design project: https://claude.ai/design/p/ada1f717-bbb1-4011-8f5a-e5b010ca9f60?file=MetaStack.dc.html
- Reference in repo: `design/` — exported design system (tokens, components, guidelines, dashboard UI kit). Source of truth is `design/MetaStack.dc.html` (interactive prototype, all states). Read `design/readme.md` first.
- **Vibe:** dark-mode competitive-gaming telemetry. Near-black canvas, a single electric violet accent glowing against it. Restrained, dense, data-first. No emoji; iconography is a few unicode glyphs (`≡ ✕ ⬇ ▲ ▼ – ✓ →`).
- **Copy:** UI copy is fully localized in **both Spanish and English** via react-i18next (no hardcoded strings). MTG proper nouns (card names, archetype names like "Izzet Cauldron") stay in English in *both* locales — that's how the community reads them. Terse noun labels, no marketing voice. The design mockup shows the Spanish locale; the English locale mirrors it (e.g. Fecha→Date, Arquetipo→Archetype, En Tendencia→Trending).
- **Design tokens** (see `design/tokens/`):
  - Color: canvas `--bg-app #0a0b10`, cards `--surface-card #11121b`, modal `#101119`. Primary accent violet neon `--neon-500 #b14bff → --neon-600 #7a2bff` (active state, primary CTA, focus rings). Mana WUBRG (`--mana-w/u/b/r/g`) are secondary accents, only for color-identity pips. Semantic: up `#2fe6a0`, down `#ff5470`, flat `#ffcb45`. Tiers: T1 violet, T2 cyan, T3 neutral.
  - Type: `--font-display` Sora (titles/labels, hero 46px/800/-.03em), `--font-body` IBM Plex Sans (body/filters), `--font-mono` JetBrains Mono (ALL data — %, deltas, dates, ranks). Fonts via Google Fonts CDN import.
  - Spacing: 8/11/14/18/22px rhythm. Radii 6 chips · 9 buttons · 11 deck cards · 15 archetype cards · 16 panels · 18 modal · 999 pills. Sidebar 280px, topbar 62px, content max 1240px.
  - Numbers: mono, one decimal for % (`14.2%`), signed deltas (`+2.1`/`-1.7`), zero-padded ranks (`01`), abbreviated dates (`24 — 28 Jun 2026`).
- **Components** (in `design/components/` as `.jsx` + `.d.ts` + `.prompt.md`): `core/` Button, IconButton, Pill · `mana/` ManaPip, ManaPips · `data/` TierBadge (+`tierFor`), ChangeIndicator, StatCard · `archetype/` ArchetypeCard (signature card). Reference implementations mount from `window.MetaStack`; port them into `src/components/` as real React+TS when building.
- **Key screens** (`design/ui_kits/dashboard/` + prototype): dashboard = topbar (diamond logo + format Pills) + 280px filter sidebar (Fecha, Tamaño de eventos, Arquetipo) + header (format title + neon date pill + StatCard strip) + archetype grid `repeat(auto-fill,minmax(248px,1fr))` + "En Tendencia" trending table. Plus expanded-archetype deck-card state and the deck modal (main/sideboard + "Exportar a MTG Arena").

## Framework-specific review rules
- No secrets in the client bundle; only VITE_ anon key is exposed client-side
- All Supabase access from the browser must be RLS read-only; writes only via service-role in CI
- Recharts data shaped in hooks/selectors, not inside JSX
- All user-facing strings go through react-i18next (no hardcoded ES/EN text)
- Scraper tests must use saved fixtures, never hit live MTGTop8 in CI
- Respect Scryfall guidelines: hotlink images, no bulk re-hosting, cache bulk data
- Responsive: filter panel collapses on mobile; charts remain legible at small widths

## Implementation mode
- Mode: disciplined
  - **disciplined** — task-execution per task: TDD + subagent code-review + PR + post-merge. Default for production.
  - **fast** — /opsx:apply: all tasks at once on one branch + a single PR for the change.
- Overridable per change when implementation starts.

## Skills
- task-execution, tdd, code-review, github-pr (dev loop)
- security-review (conditional subagent, security-sensitive tasks)
- bug-fix (reproduce-first defect workflow, with hotfix variant)
