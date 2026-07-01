## Context

MetaStack is a fresh React 19 + Vite + TS SPA that reads directly from Supabase (RLS read-only) and a Python + BeautifulSoup4 scraper that writes to Supabase from a daily GitHub Actions cron. This change is the first vertical slice and therefore also the first time the schema, the scraper, and the frontend data path all exist. The design system is already exported to `design/` (tokens + reference `.jsx` components: `ArchetypeCard`, `ManaPip(s)`, `Pill`, `StatCard`). Constraints from `CLAUDE.md`: browser is strictly read-only, no secrets beyond the VITE anon key in the client, all UI copy via react-i18next (ES/EN), scraper tests use saved fixtures (never live), Scryfall image work is deferred.

## Goals / Non-Goals

**Goals:**

- A working schema that holds each format's Last 2 Weeks archetype breakdown (share %, rank, color identity) + a last-updated timestamp, readable by the anon role only.
- A scraper that parses MTGTop8 `meta=50` for all 5 formats and upserts the breakdown idempotently (a re-run replaces, never accumulates).
- A dashboard that renders the top-20 archetype grid for the URL-selected format (default Standard), with loading/empty/error states and an "Updated X ago" indicator.
- Reuse the exported design components by porting them to real React + TS.

**Non-Goals:**

- Any filter beyond the hardcoded Last 2 Weeks window; week-over-week delta; real Scryfall card art; deck lists / deck modal / Arena export. (All deferred.)
- Server-side rendering or any API layer — the browser reads Supabase directly.
- Storing historical snapshots — only the current Last 2 Weeks breakdown per format is kept (overwritten each run).



## Decisions



### Data model

Three tables:

- `formats` — one row per format: `code` (PK, `ST`/`PI`/`MO`/`PAU`/`PREM`), `name`, `last_updated_at` (nullable timestamptz).
- `archetypes` — dimension of archetype identity per format: `id` (PK), `format_code` (FK), `name`, `color_identity` (text, WUBRG subset, `''` for colorless), unique on (`format_code`, `name`).
- `metagame_snapshots` — the current Last 2 Weeks share per archetype: `archetype_id` (FK), `format_code` (FK, denormalized for cheap filtering), `share_pct` (numeric), `rank` (int). One row per archetype in the current breakdown.

Rationale: keeping `formats.last_updated_at` on the format (not per row) makes the freshness indicator a single cheap read. `metagame_snapshots` is replace-on-run: the scraper deletes the format's snapshot rows and re-inserts, so no stale archetypes linger (satisfies the "re-run replaces" scenario). We store ALL archetypes MTGTop8 returns; the **top-20 cap is a view concern** (query `order by rank limit 20`), keeping the data faithful and the cap adjustable without re-scraping.

Alternative considered: a single wide `snapshots` table with archetype fields inline (no `archetypes` table). Rejected — a separate archetype dimension is the natural home for future per-archetype data (deck lists, Scryfall art) without reshaping.

### Color identity representation

Store the raw WUBRG letters MTGTop8 exposes as a short string (e.g. `"UR"`, `""` for colorless). The view maps letters → pips in WUBRG order; empty → one gray pip. Rationale: matches `ArchetypeCard`'s existing `colors="UR"` prop contract and keeps parsing trivial.

### Scraper shape

`scraper/mtgtop8.py` already holds pure URL/format helpers. Add pure parse functions (`parse_meta_breakdown(html) -> list[Archetype]`) tested against saved fixtures, and a thin `scraper/run.py` that does network + Supabase upsert (via `supabase-py` or direct PostgREST with the service-role key). Network and DB stay out of the parse functions so tests never touch the wire. Ranks are assigned client-side by descending share after parse.

Alternative considered: parse + write in one function. Rejected — violates the fixture-testability requirement.

### Frontend data path

A `useMetagameBreakdown(formatCode)` hook wraps the supabase-js query (`metagame_snapshots` joined to `archetypes`, `order by rank`, `limit 20`) and returns `{ data, loading, error }`, plus a small read for `formats.last_updated_at`. Format state lives in the URL via a `?f=` search param (read/written with `URLSearchParams` + `history.replaceState`, or `react-router` if we add it — see Open Questions). Components ported from `design/`: `ArchetypeCard`, `ManaPip`/`ManaPips`, `Pill` (format switcher), plus new `Spinner` and `EmptyState`. All copy via i18n keys added to `src/locales/{en,es}.json`.

Alternative considered: React Context/global store for format state. Rejected — the URL is the single source of truth and satisfies persistence for free; a store would duplicate it.

### Freshness rendering

"Updated X ago" computed client-side from `last_updated_at` using a tiny relative-time helper (or `Intl.RelativeTimeFormat`, which is localizable for ES/EN). No extra dependency.

## Risks / Trade-offs

- **MTGTop8 HTML changes / brittle parsing** → isolate parsing in pure functions with fixtures; a parse failure per format leaves prior data intact (spec'd), so the site degrades to stale rather than broken.
- **Color-identity data from MTGTop8 may be inconsistent or absent for some archetypes** → treat missing/unknown as colorless (one gray pip) rather than failing the row.
- **Replace-on-run deletes then inserts snapshot rows** → do it per-format inside a transaction (or delete+insert ordered) so a mid-run failure doesn't leave a format with zero rows and a fresh timestamp; only stamp `last_updated_at` after a successful insert.
- **Empty DB before first cron run** → the empty state is a first-class UI state, so the app is correct even with no data; we can also trigger the scraper manually once after merge to seed.
- **anon key must never allow writes** → RLS policies grant `select` only; verified by a test/manual check that an anon insert is rejected.



## Migration Plan

1. Apply `supabase/schema.sql` to the Supabase project (manual, per `CLAUDE.md`); seed the 5 `formats` rows.
2. Add RLS read-only policies; confirm anon can read, cannot write.
3. Land scraper + tests; run it once manually (or trigger the workflow) to seed real data.
4. Land the frontend; verify against seeded data on a Vercel preview.
5. Rollback: the frontend degrades to the empty state if the schema/data is absent; reverting the frontend PR removes the view. Schema is additive (new tables) — dropping them is safe since nothing else depends on them yet.



## Open Questions

- **Routing:** introduce `react-router` now for `?f=` handling and future routes, or keep it dependency-free with `URLSearchParams` + `history.replaceState` for this slice? Leaning dependency-free now, add router when a second route appears — but flagging since later filter changes may want real routing.
- **Supabase write client in the scraper:** `supabase-py` vs. raw PostgREST calls with `requests`. Leaning `supabase-py` for clarity, but it adds a dependency; either satisfies the spec.

