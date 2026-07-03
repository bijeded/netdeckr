# MetaStack — Handoff for the Next Change

Paste-ready context to continue MetaStack in a new chat. Discovery and project-init are **done** — do not re-run them.

## Where things are
- **Repo:** `github.com/bijeded/metastack` (public). Local: `/Users/franciscovenegas/Desktop/Cowork/Metastack`
- **Live app:** https://metastack-three.vercel.app (auto-deploys on merge to `main`; preview per PR, but previews are Vercel-auth-protected — open while logged in)
- **Source-of-truth docs:** `CLAUDE.md` (stack, commands, conventions, deploy, design tokens) and `openspec/project.md`
- **Living specs:** `openspec/specs/metagame-breakdown-view/` and `openspec/specs/metagame-data-pipeline/`
- **Design system:** `design/` (tokens in `design/tokens/`, reference components, `design/MetaStack.dc.html` prototype). Theme wired via `src/styles/tokens.css`; dashboard layout in `src/styles/dashboard.css`.

## What's shipped (all changes archived under `openspec/changes/archive/`)
1. **`view-metagame-breakdown`** — pick a format → top-20 archetype breakdown, format persisted in `?f=`, "Updated X ago" freshness, loading/empty/error states, ES/EN.
2. **`add-metagame-filters`** (2026-07-01) — a **time-frame filter** in a real full-height filter sidebar: pick one of three windows (Last 5 Days / 2 Weeks / 2 Months), persisted in `?w=`, default Last 5 Days, heading "Time Frame"/"Periodo", with a `≡` toggle + mobile drawer. Breakdown + freshness are per (format, window). Backed by a window-aware schema and a scraper that fetches all three windows per format.
3. **`view-archetype-decklists`** (2026-07-02) — expand an archetype card into its recent decklists (4 most-recent Top-4 finishes, else latest 4), a decklist modal (main/sideboard, dismissible, focus return), and **MTG Arena export** from the modal: Standard/Pioneer copy Arena text to the clipboard (localized confirmation, graceful failure); Modern/Pauper/Pre-Modern download a `.txt` (button reads "Download Decklist" for those). Export text leads with an `About`/`Name <archetype>` block and prefers Scryfall canonical name + non-foil printing when present, else the scraped name. Backed by new `events`/`decks`/`deck_cards` tables (RLS read-only), MTGTop8 event + decklist parsers, incremental + staggered per-format scraping, and a 6-month prune. Specs: `archetype-decklists-view` (new) + `metagame-data-pipeline` (extended).
4. **`add-scryfall-mapping`** (2026-07-02) — a **Scryfall bulk-data sync + card mapping** so `deck_cards.scryfall_name/set_code/collector_number` are populated (were always null). `scraper/scryfall.py` downloads the `default_cards` bulk file once/day (date-keyed cache, `actions/cache` shared across the staggered per-format scrape jobs) and resolves a scraped name → canonical non-foil paper printing, handling split/DFC names incl. MTGTop8's single-slash form (`Fire / Ice`) and preferring a standard printing over promo/Universes-Beyond variants. The writer enriches new cards at scrape time; a one-time `python scraper/run.py --backfill-scryfall` (service-role) mapped the existing rows (**41,053 of 41,054** — the miss is `Embiggen`, a silver-border card). No schema change (columns already existed). Specs: `scryfall-card-mapping` (new) + `metagame-data-pipeline` (extended).
5. **`add-card-art`** (2026-07-02) — **real Scryfall card art** hotlinked from the CDN. `deck_cards.image_url` + `archetypes.signature_card_name`/`art_image_url` (nullable). The resolver reads `image_uris.normal` (front-face fallback); the writer stores the deck-card image, and a signature-card pass sets each archetype's most-played non-land card + art (basics-only land exclusion — a type-based one is a follow-up). Frontend: a `CardArtPreview` shows a card's full art on **hover (mouse) / touch (mobile)** of its name in the decklist modal (portal, lazy, viewport-clamped, `onError` fallback, no layout shift); **ArchetypeCard** renders the signature-card art (cover) with the gradient as fallback. The `--backfill-scryfall` pass now uses `image_url` as the completeness sentinel (re-enriches identity-mapped-but-imageless rows) and also refreshes archetype art; backfill populated **41,053** deck-card images + **325** archetype arts. Specs: `card-art-display` (new) + `scryfall-card-mapping` / `metagame-data-pipeline` (extended).

6. **`refine-signature-card-selection`** (2026-07-02) — a **truer archetype signature card**. `deck_cards` now stores `type_line`/`rarity`/`cmc`/`released_at` and `archetypes.art_crop_url` (all nullable, additive schema). Land exclusion is now **type-based** (any `type_line` containing "land", basic + nonbasic — replaces the old basic-name list), and non-land candidates are ranked by total quantity → rarity (mythic>rare>uncommon>common) → set release date → cmc → name, with null metadata sorting last (resolved beats unresolved at equal quantity). `refresh_archetype_art` now also writes `art_crop`, and the **ArchetypeCard** prefers `art_crop_url` (falls back to normal image, then gradient). A one-time `python scraper/run.py --backfill` (service-role) fills the new columns on existing rows (keyed on the `type_line` null sentinel) and recomputes signature cards + art. Specs: `metagame-data-pipeline` / `scryfall-card-mapping` / `card-art-display` (extended).

Backed by a daily MTGTop8 scraper → Supabase (RLS read-only). 134 frontend + 108 scraper tests.

## Stack & commands (see CLAUDE.md for full detail)
- Frontend: React 19 + Vite 8 + TS 5.8, Vitest (config in **separate `vitest.config.ts`**), oxlint, react-i18next, @supabase/supabase-js, Recharts (still unused).
- Scraper: Python 3.12 + requests + BeautifulSoup4 (venv at `scraper/venv`); no `supabase-py` (raw PostgREST via requests).
- Commands: `npm run dev` | `npm run build` | `npm run test` | `npm run type-check` | `npm run lint`; scraper: `cd scraper && ./venv/bin/pytest`.
- CI required check name is **`ci`**. Branch protection is active on `main` — everything lands via PR; the assistant cannot self-merge without an explicit "merge" / "squash and merge".

## Data model (Supabase — schema is manual, `supabase/schema.sql`)
- `formats(code PK, name, last_updated_at)` — codes ST/PI/MO/PAU/PREM. `last_updated_at` is **retained but no longer the freshness source of truth** (see `format_window_freshness`).
- `archetypes(id, format_code FK, name, color_identity, signature_card_name, art_image_url, unique(format_code,name))` — shared across windows; the scraper upserts (get-or-create), never deletes per-run. `signature_card_name`/`art_image_url` (nullable) are the archetype's most-played non-land card + its hotlinked Scryfall image, recomputed each run.
- `metagame_snapshots(format_code, meta_window, archetype_id) PK` — `share_pct`, `rank`. **Replace-on-run scoped to (format_code, meta_window)**. `meta_window` is a **logical key** (`5days`/`2weeks`/`2months`), CHECK-constrained.
- `format_window_freshness(format_code, meta_window) PK, last_updated_at` — per-(format, window) freshness; drives "Updated X ago".
- `events(id, source_event_id, format_code FK, name, event_date, unique(source_event_id, format_code))` — a MTGTop8 event.
- `decks(id, event_id FK, archetype_id FK, source_deck_id, player, placement, unique(event_id, source_deck_id))` — one deck at an event. `placement` is raw text ("1", "3-4", "5-8") because `placing` is a reserved SQL word.
- `deck_cards(id, deck_id FK, board 'main'|'side', quantity, card_name, scryfall_name, set_code, collector_number, image_url)` — one card line; `scryfall_*` + `image_url` are **populated** by the Scryfall mapping (scrape-time + one-time backfill); still nullable, and a resolution miss (e.g. silver-border cards) stays null → export falls back to `card_name`, art to the placeholder. `image_url` is the backfill's completeness sentinel.
- RLS: anon SELECT only on all tables; writes only via service-role key.

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
1. ~~Type-based land exclusion for the archetype signature card~~ — **DONE** in `refine-signature-card-selection` (2026-07-02): exclusion is now type-based and selection ranks by quantity→rarity→set-recency→cmc→name. **Post-merge steps still required** (service-role): apply `supabase/schema.sql` (adds `deck_cards.{type_line,rarity,cmc,released_at}` + `archetypes.art_crop_url`), then run `python scraper/run.py --backfill` once to fill the new columns + recompute `art_crop` on existing rows. Until then the new columns are null in prod (ArchetypeCard keeps showing the normal image — no regression).
2. **Re-map existing rows on heuristic changes** — backfill passes key on a null sentinel (`--backfill-scryfall` on `image_url is null`, `--backfill` on `type_line is null`), so once rows carry those columns a *later* resolver improvement won't refresh them. A `--remap-scryfall` mode that re-resolves all rows (not just sentinel-null ones) would let heuristic changes reach existing data. (Archetype art already recomputes every run, so it's unaffected.)
3. **Week-over-week delta (▲/▼)** — needs storing/comparing two snapshots over time (schema is current-only; requires a history table or a "previous share" column). Design has `ChangeIndicator`.
4. **More filters: event + archetype** — the design sidebar has "Evento" and "Arquetipo" groups. The real filter sidebar already exists (`src/components/WindowSelector.tsx` pattern + `src/App.tsx` `.sidebar`), so new filter groups slot in beside the time-frame group. The `events`/`decks` tables now store the complete set of events (not just top finishes), so the data for these filters is already there. (Event-size was evaluated and dropped — MTGTop8's size/scope windows aren't uniform across formats.)
5. **StatCard strip + "En Tendencia" trending table** — design has both (topbar/header StatCards, trending table with `ChangeIndicator`); trending needs top-cards scraping + history.

## To start the next change
Open a new chat here and say, e.g.:
> *"Read docs/HANDOFF.md. Let's implement the already-proposed `fix-archetype-name-casing` change (disciplined mode). Don't re-run propose."*

— or pick any deferred item above (for a brand-new change: run **user-stories** then **`/opsx:propose <id>`**). Discovery/project-init are done; don't re-run them.
