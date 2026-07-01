# MetaStack — Handoff for the Next Change

Paste-ready context to continue MetaStack in a new chat. Discovery and project-init are **done** — do not re-run them.

## Where things are
- **Repo:** `github.com/bijeded/metastack` (public). Local: `/Users/franciscovenegas/Desktop/Cowork/Metastack`
- **Live app:** https://metastack-three.vercel.app (auto-deploys on merge to `main`; preview per PR, but previews are Vercel-auth-protected — open while logged in)
- **Source-of-truth docs:** `CLAUDE.md` (stack, commands, conventions, deploy, design tokens) and `openspec/project.md`
- **Living specs:** `openspec/specs/metagame-breakdown-view/` and `openspec/specs/metagame-data-pipeline/`
- **Design system:** `design/` (tokens in `design/tokens/`, reference components, `design/MetaStack.dc.html` prototype). Theme wired via `src/styles/tokens.css`.

## What's shipped (feature 1: `view-metagame-breakdown`, archived)
Pick a format → top-20 archetype breakdown (Last 2 Weeks), format switch persisted in `?f=`, "Updated X ago" freshness, loading/empty/error states, ES/EN. Backed by a daily MTGTop8 scraper → Supabase (RLS read-only). 75 tests. Archived at `openspec/changes/archive/2026-07-01-view-metagame-breakdown/`.

## Stack & commands (see CLAUDE.md for full detail)
- Frontend: React 19 + Vite 8 + TS 5.8, Vitest (config in **separate `vitest.config.ts`** — Vite 8 rolldown clashes with vitest's bundled Vite), oxlint, react-i18next, @supabase/supabase-js, Recharts (unused so far).
- Scraper: Python 3.12 + requests + BeautifulSoup4 (venv at `scraper/venv`); no `supabase-py` (raw PostgREST via requests).
- Commands: `npm run dev` | `npm run build` | `npm run test` | `npm run type-check` | `npm run lint`; scraper: `cd scraper && ./venv/bin/pytest`.
- CI required check name is **`ci`**. Branch protection is active on `main`.

## Data model (Supabase — schema is manual, `supabase/schema.sql`)
- `formats(code PK, name, last_updated_at)` — codes ST/PI/MO/PAU/PREM
- `archetypes(id, format_code FK, name, color_identity, unique(format_code,name))` — `color_identity` = WUBRG subset, `''` = colorless
- `metagame_snapshots(archetype_id PK, format_code, share_pct numeric(5,2), rank)` — **replace-on-run**, current-only (no history)
- RLS: anon SELECT only; writes only via service-role key.

## Workflow to follow (Implementation mode: disciplined)
1. New session in the repo → optionally the **user-stories** skill → **`/opsx:propose <change-id>`** (pass the stories as context).
2. **task-execution** skill, one task group per branch: TDD (tests first) → spawn a subagent **code-review** (clean context) → conditional **security-review** subagent for sensitive surfaces → PR via **github-pr** → **human merges** (the assistant cannot self-merge without an explicit "squash and merge"), then check off tasks and pull `main`.
3. When all tasks done → **`/opsx:sync`** deltas into `openspec/specs/` → **`/opsx:archive`**.
- Branch `task/<n>-<desc>`; commit `<task-id>: <imperative>`; PR bodies end with the Claude Code footer + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Gotchas learned (save time)
- **Applying schema / seeding** needs the **service-role key** (a GitHub secret `SUPABASE_SERVICE_ROLE_KEY` + repo secret `SUPABASE_URL`). The assistant only has the anon key — so "apply schema" and local seed runs are human steps, or trigger the workflow: `gh workflow run scrape.yml --ref main`.
- **Color identity is derived from the archetype name** (guild/shard/mono/explicit letters) — MTGTop8 exposes no mana symbols. See `scraper/mtgtop8.py:color_identity_for`.
- MTGTop8 shares include **decimals** for the long tail (e.g. `0.8 %`); category headers (AGGRO/CONTROL/COMBO) must be excluded from archetypes.
- Transient CI `npm ECONNRESET` happens occasionally → just `gh run rerun <id> --failed`.
- `.env.local` holds `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (already set locally and in Vercel).

## Deferred work → candidate next changes
1. **Filters** (date / event-size / event / archetype). Date/size map to MTGTop8 `meta` params: `50`=Last 2 Weeks, `326`=Last 5 Days, `52`=Last 2 Months, `46`=Large Events (2mo), `285`=MTGO (2mo). Needs schema for multiple windows + scraper fetching them + UI sidebar (design has it).
2. **Week-over-week delta (▲/▼)** — needs storing/comparing two snapshots over time (current schema is current-only; requires a history table or a "previous share" column). Design has `ChangeIndicator`.
3. **Real Scryfall card art** — replace placeholder gradient; store a representative card per archetype; use current non-foil printing, no special art; hotlink `image_uris`.
4. **Decklist modal + MTG Arena export** — event top-16 + individual decklists (MTGTop8 `/event?e={id}&d={did}&f=ST`), deck modal (main/sideboard), "Exportar a MTG Arena". New scraper pages + schema (events, decks, deck_cards) + `ArchetypeCard` click → expand → modal.

## To start the next change
Open a new chat here and say, e.g.: *"Let's build the metagame filters (date + event size). Run user-stories, then /opsx:propose add-metagame-filters."* — or pick any deferred item above.
