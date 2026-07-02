# Continuation prompt — MetaStack `view-archetype-decklists`

> **STATUS: DONE & ARCHIVED (2026-07-02).** The `view-archetype-decklists` change is fully shipped (tasks 1–5), synced, and archived at `openspec/changes/archive/2026-07-02-view-archetype-decklists/`. See `docs/HANDOFF.md` → "What's shipped" #3 for the summary. The backfill review surfaced a real defect (case-variant duplicate archetype rows) that was carved out into the separate **`fix-archetype-name-casing`** proposal (proposed, not yet implemented). This file is kept for historical context only — start from `docs/HANDOFF.md`.

Paste the block below into a new chat in this repo to continue. It covers the **backfill data review** (do this first) and the **remaining tasks**. Discovery/project-init are done; do not re-run them.

---

Read `docs/HANDOFF.md` and `CLAUDE.md` first. We're mid-way through the OpenSpec change **`view-archetype-decklists`** (disciplined mode). Do NOT re-run discovery/project-init.

## Where we are
- Repo: local at `/Users/franciscovenegas/Desktop/Cowork/Metastack`, GitHub `bijeded/metastack`, live at https://metastack-three.vercel.app. Branch protection on `main`; everything lands via PR + squash-merge (assistant cannot self-merge without an explicit "squash and merge"). CI check is `ci`.
- Change dir: `openspec/changes/view-archetype-decklists/` (proposal, design, specs, tasks). Validate with `openspec validate view-archetype-decklists --strict`.
- Follow the disciplined workflow: `task-execution` skill per task group → TDD → clean-context `code-review` subagent → `github-pr` → human squash-merges → tick `tasks.md` boxes on `main` (they ride along on the next branch since `main` is protected) → delete the merged branch.

## Shipped so far (all merged to `main`)
- **1** schema + scraper decklist data contract: `events`, `decks`, `deck_cards` tables (RLS read-only, idempotent upserts, nullable Scryfall cols), MTGTop8 event/decklist parsers, 6-month prune. (`decks.placement` — `placing` is a reserved SQL word.)
- **1b** incremental + staggered scraping: `existing_event_ids` skip, per-format `run.py` arg, 5 staggered crons in `scrape.yml`, `timeout-minutes: 60`.
- **2** read decks + expand archetype: `useDecks` hook + `deckSelection` selector (4 most-recent Top-4 finishes, else latest 4), `windowStartISO`, expandable `ArchetypeCard`, hide-until-data, collapse-on-change.
- **2b** ArchetypeCard polish: `tierFor`/`TierBadge` (T1/T2/T3/Rogue), `placementBadge`, `#N` rank, full-width expand, deck-card grid.
- **2c** DeckCard refinements: "Recent decklists" header, smaller cards + gap + `min-width:0`, no pips, right-aligned badge, `.deck-card` hover lift (with prefers-reduced-motion), whole card is a button, "Otros"→"Rogue" (EN).
- **3** decklist modal: `useDeckCards` hook, `DecklistModal` (main/sideboard, dialog, Esc/close/backdrop dismiss, focus return, responsive stack, loading + error states, plural counts). Deck rows carry `decks.id`. Card names prefer `scryfall_name`, fall back to `card_name`.

Frontend: 104 Vitest tests. Scraper: 62 pytest tests. Stack per `CLAUDE.md` (React 19 + Vite + TS, Vitest config in `vitest.config.ts`; Python 3.12 scraper, `./scraper/venv/bin/pytest`).

## DO FIRST — backfill data review
The daily scrape ran (backfill complete) but the user reported "it didn't get all the info correctly." Investigate before building task 4. Plan:
1. **Read-only audit** via the anon key (`.env.local` has `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; query PostgREST with `curl`). Characterize what's stored:
   - counts of events/decks/deck_cards per format (any format at 0?);
   - decks whose mainboard total ≠ ~60 (truncated / over-parsed) or with 0 cards;
   - `placement` value distribution (all one value?);
   - decks whose archetype name doesn't match a breakdown archetype (attach failures);
   - null/implausible `event_date`.
2. Decide: scraper **parser gap** (→ reproduce with a saved HTML fixture under `scraper/tests/fixtures`, then fix via the `bug-fix` skill: failing test first) vs. just **incomplete crawl coverage** (re-run `gh workflow run scrape.yml -f format=all`).
3. Ask the user what they specifically noticed (missing decks? wrong cards/quantities? split/DFC names? placements? wrong archetype attach?) to focus the dig.
- Parser reference: `scraper/mtgtop8.py` (`parse_event_list`, `parse_event_decks`, `parse_decklist`); real MTGTop8 event page shape documented in the parser docstrings/fixtures. Never hit live MTGTop8 in CI — fixtures only; regenerate fixtures deliberately.

## Remaining tasks in the change
- **Task 4 — MTG Arena export** (`tasks.md` §4): `arenaExport.ts` util building Arena text (`Deck`/`Sideboard`, `"<qty> <name>"`), preferring Scryfall canonical name + non-foil set/collector, falling back to scraped name. Standard/Pioneer → copy to clipboard + localized toast (handle clipboard failure); Modern/Pauper/Pre-Modern → `.txt` download. Wire an export button into `DecklistModal` (design prototype has it in the modal header; see `design/MetaStack.dc.html` ~line 210). The `onSelect` seam + modal already exist.
- **Prereq to do WELL:** there is **no Scryfall sync in the repo** (CLAUDE.md describes one aspirationally). `deck_cards.scryfall_name/set_code/collector_number` are currently null, so export falls back to scraped names. Before/alongside task 4, draft a **separate OpenSpec change** (e.g. `add-scryfall-mapping`) for a Scryfall bulk-sync + scrape-time card mapping that populates those columns. Confirm with the user whether to land it before task 4 or ship export on the fallback first.
- **Task 5 — wrap-up** (`tasks.md` §5): full suite (`npm run lint && npm run type-check && npm run test && cd scraper && ./venv/bin/pytest`); then `/opsx:sync` deltas into `openspec/specs/` and `/opsx:archive` the change via a `chore:` PR.

## Gotchas / conventions (save time)
- `main` protected → PR + squash. After merge: `git checkout main && git pull`, delete the merged remote+local branch (GitHub does not auto-delete here), tick `tasks.md`.
- Validate `supabase/schema.sql` with **pglast** (real libpg_query), not just sqlglot — sqlglot misses reserved-word-as-identifier (that's how `placing`→`placement` slipped through). Applying schema needs the service-role key (human/CI step; assistant has anon only).
- Global CSS only applies if imported in `src/main.tsx` (`src/styles/dashboard.css` is; `src/index.css` is dead). Design tokens live in `design/tokens/*.css` (imported via `src/styles/tokens.css`) — use `var(--...)`, not hex.
- i18n: all UI strings via react-i18next (ES/EN); MTG proper nouns + competitive labels (1st/2nd/Top 4) stay English in both locales.
- Tests: jsdom `matchMedia` + i18n are set up in `src/test/setup.ts`. Supabase is mocked in hook tests via a chainable `vi.hoisted` builder (see `useDecks.test.tsx` / `useDeckCards.test.tsx`).
- Live visual verification: `npm run dev` + Playwright; `.env.local` is present so real data loads.

Start by asking the user what looked wrong in the backfill, then run the read-only audit.
