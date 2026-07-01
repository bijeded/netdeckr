# MetaStack — Handoff for the Next Change

Paste-ready context to continue MetaStack in a new chat. Discovery and project-init are **done** — do not re-run them.

## Where things are
- **Repo:** `github.com/bijeded/metastack` (public). Local: `/Users/franciscovenegas/Desktop/Cowork/Metastack`
- **Live app:** https://metastack-three.vercel.app (auto-deploys on merge to `main`; preview per PR, but previews are Vercel-auth-protected — open while logged in)
- **Source-of-truth docs:** `CLAUDE.md` (stack, commands, conventions, deploy, design tokens) and `openspec/project.md`
- **Living specs:** `openspec/specs/metagame-breakdown-view/` and `openspec/specs/metagame-data-pipeline/`
- **Design system:** `design/` (tokens in `design/tokens/`, reference components, `design/MetaStack.dc.html` prototype). Theme wired via `src/styles/tokens.css`; dashboard layout in `src/styles/dashboard.css`.

## What's shipped (both changes archived under `openspec/changes/archive/`)
1. **`view-metagame-breakdown`** — pick a format → top-20 archetype breakdown, format persisted in `?f=`, "Updated X ago" freshness, loading/empty/error states, ES/EN.
2. **`add-metagame-filters`** (2026-07-01) — a **time-frame filter** in a real full-height filter sidebar: pick one of three windows (Last 5 Days / 2 Weeks / 2 Months), persisted in `?w=`, default Last 5 Days, heading "Time Frame"/"Periodo", with a `≡` toggle + mobile drawer. Breakdown + freshness are per (format, window). Backed by a window-aware schema and a scraper that fetches all three windows per format.

Backed by a daily MTGTop8 scraper → Supabase (RLS read-only). ~100 frontend + scraper tests.

## Stack & commands (see CLAUDE.md for full detail)
- Frontend: React 19 + Vite 8 + TS 5.8, Vitest (config in **separate `vitest.config.ts`**), oxlint, react-i18next, @supabase/supabase-js, Recharts (still unused).
- Scraper: Python 3.12 + requests + BeautifulSoup4 (venv at `scraper/venv`); no `supabase-py` (raw PostgREST via requests).
- Commands: `npm run dev` | `npm run build` | `npm run test` | `npm run type-check` | `npm run lint`; scraper: `cd scraper && ./venv/bin/pytest`.
- CI required check name is **`ci`**. Branch protection is active on `main` — everything lands via PR; the assistant cannot self-merge without an explicit "merge" / "squash and merge".

## Data model (Supabase — schema is manual, `supabase/schema.sql`)
- `formats(code PK, name, last_updated_at)` — codes ST/PI/MO/PAU/PREM. `last_updated_at` is **retained but no longer the freshness source of truth** (see `format_window_freshness`).
- `archetypes(id, format_code FK, name, color_identity, unique(format_code,name))` — shared across windows; the scraper upserts (get-or-create), never deletes per-run.
- `metagame_snapshots(format_code, meta_window, archetype_id) PK` — `share_pct`, `rank`. **Replace-on-run scoped to (format_code, meta_window)**. `meta_window` is a **logical key** (`5days`/`2weeks`/`2months`), CHECK-constrained.
- `format_window_freshness(format_code, meta_window) PK, last_updated_at` — per-(format, window) freshness; drives "Updated X ago".
- RLS: anon SELECT only; writes only via service-role key.

## Workflow to follow (Implementation mode: disciplined)
1. New session in the repo → optionally **user-stories** skill → **`/opsx:propose <change-id>`** (pass the stories as context).
2. **task-execution** skill, one task group per branch: TDD (tests first) → spawn a subagent **code-review** (clean context) → conditional **security-review** subagent for sensitive surfaces → PR via **github-pr** → **human merges**, then check off tasks and pull `main`.
3. When all tasks done → **`/opsx:sync`** deltas into `openspec/specs/` → **`/opsx:archive`** (both land via a `chore:` PR since `main` is protected).
- Branch `task/<n>-<desc>`; commit `<task-id>: <imperative>`; PR bodies end with the Claude Code footer + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Tip:** when a change spans a shared contract across schema + scraper + frontend (like `meta_window`), bundle those into ONE PR so `main` never has a broken intermediate.

## Gotchas learned (save time)
- **`meta_window` is a format-independent LOGICAL key** (`5days`/`2weeks`/`2months`), NOT the raw MTGTop8 param. **MTGTop8's numeric `meta` IDs are per-format** — same window, different ID per format — so the scraper maps `(format, window) → meta ID` via `WINDOW_META`/`meta_id_for` in `scraper/mtgtop8.py`. Hardcoding one format's IDs for all formats silently stores identical data (the bug that time-frame verification caught). Only 3 windows are universal across all formats; "Large Events"/"MTGO" were dropped.
- **`window` is a reserved SQL keyword** — the column is `meta_window` (quoting would be a cross-stack footgun).
- **Global CSS only applies if imported in `src/main.tsx`.** `src/index.css` is orphaned Vite-template leftover and does nothing — layout classes live in `src/styles/dashboard.css` (imported by main.tsx). A class-based layout that "does nothing" is almost always this.
- **Schema deploy dance:** applying `supabase/schema.sql` needs the **service-role key** (a human/CI step; the assistant only has the anon key). After merging a schema+scraper PR: apply the schema in the Supabase SQL editor, then `gh workflow run scrape.yml --ref main` to repopulate. `schema.sql` is idempotent (safe to re-run); validate SQL locally with `sqlglot` but note it does NOT catch reserved-keyword-as-identifier errors.
- **Color identity** is derived from the archetype name (guild/shard/mono/explicit letters); MTGTop8 exposes no mana symbols. See `scraper/mtgtop8.py:color_identity_for`.
- **Tests:** jsdom has no `matchMedia` — it's stubbed in `src/test/setup.ts` (the sidebar drawer needs it). Scraper tests use saved fixtures under `scraper/tests/fixtures`, never live network.
- Transient CI `npm ECONNRESET` happens occasionally → `gh run rerun <id> --failed`.
- `.env.local` holds `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (set locally and in Vercel) — useful for read-only anon verification via `curl` against the PostgREST API.

## Deferred work → candidate next changes
1. **Week-over-week delta (▲/▼)** — needs storing/comparing two snapshots over time (schema is current-only; requires a history table or a "previous share" column). Design has `ChangeIndicator`.
2. **Real Scryfall card art** — replace the placeholder gradient; store a representative card per archetype; current non-foil printing, no special art; hotlink `image_uris`.
3. **Decklist modal + MTG Arena export** — event top-16 + individual decklists (MTGTop8 `/event?e={id}&d={did}&f=ST`), deck modal (main/sideboard), "Exportar a MTG Arena". New scraper pages + schema (events, decks, deck_cards) + `ArchetypeCard` click → expand → modal.
4. **More filters: event + archetype** — the design sidebar has "Evento" and "Arquetipo" groups. The real filter sidebar already exists (`src/components/WindowSelector.tsx` pattern + `src/App.tsx` `.sidebar`), so new filter groups slot in beside the time-frame group. (Event-size was evaluated and dropped — MTGTop8's size/scope windows aren't uniform across formats.)
5. **StatCard strip + "En Tendencia" trending table** — design has both (topbar/header StatCards, trending table with `ChangeIndicator`); trending needs top-cards scraping + history.

## To start the next change
Open a new chat here and say, e.g.:
> *"Read docs/HANDOFF.md. Let's build the week-over-week delta indicators. Run user-stories, then /opsx:propose add-wow-deltas."*

— or pick any deferred item above. Discovery/project-init are done; don't re-run them.
