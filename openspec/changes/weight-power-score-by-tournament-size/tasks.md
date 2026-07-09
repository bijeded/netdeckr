# Tasks

Cross-stack change — one task group per branch/PR (disciplined mode). Safe `main` ordering: **schema (nullable column) → scraper (parse+persist) → frontend (read + weight + tier floor)**. The schema column exists before the frontend selects it; the scraper can populate before or after the frontend reads it because null defaults to a small event either way.

## 1. Schema — add `events.player_count`

- [x] 1.1 Add nullable `player_count integer` to the `events` table in `supabase/schema.sql` (additive, `add column if not exists` style so the file stays idempotent).
- [x] 1.2 Validate the schema locally with `pglast` (real PostgreSQL parser; confirm no reserved-word/identifier error).
- [x] 1.3 Confirm RLS is unaffected (anon SELECT already covers the row; no new policy needed) and note the manual service-role apply step in the PR description.

## 2. Scraper — parse and persist tournament size

- [x] 2.1 Add saved fixtures: one MTGTop8 event page **with** a displayed player count and one **without** (under `scraper/tests/fixtures`).
- [x] 2.2 TDD `parse_event_size(html) -> int | None` in `scraper/mtgtop8.py` against the fixtures (returns the integer when present, `None` when absent), no network.
- [x] 2.3 Carry `player_count` on the `Event` dataclass and populate it in the event-parsing flow (reuse the event-results HTML already fetched — no extra request).
- [x] 2.4 Persist `player_count` in `SupabaseWriter`'s event upsert; on update, write a newly available/changed size but **never overwrite a non-null stored size with null**. Add a writer test for the "don't null a known size" guard.
- [x] 2.5 Run `cd scraper && ./venv/bin/pytest`; all scraper tests green.

## 3. Frontend — thread size, size-weight the Power Score, tighten Tier 1

- [ ] 3.1 Select `events.player_count` in `useMetagame`/`metagame.ts` and carry a nullable `playerCount` onto each `DeckRow`.
- [ ] 3.2 TDD in `powerScore.ts`: a `sizeWeight(size: number | null)` (small-size default when null via a low-clamped weight), and rework `archetypePowerScore` to take `(placement, size)` inputs — Wilson lower bound of the **size-weighted mean** finish quality over an **effective n = Σ weights**. Property tests: bigger tournaments ⇒ strictly higher score at equal finishes; all-null field degrades gracefully (no error); volume-without-depth still doesn't win.
- [ ] 3.3 Add `T1_MIN_DECKS` floor and tune `Z_DEFAULT`: in `assignTiers`, cap sub-floor archetypes at T2 (never forced to fringe), keep tier order monotonic. Tests for the floor + monotonicity (value-independent).
- [ ] 3.4 Keep `windowTrend` on **raw, unweighted** mean quality (unchanged semantics); confirm via test that size does not affect the trend arrow.
- [ ] 3.5 Verify share %, StatCard totals, trending, and decklists are unchanged (assert share-invariance in a test); run `npm run test`, `npm run type-check`, `npm run lint`.
- [ ] 3.6 Live read-only verification across all five formats (anon key): confirm large-format Tier 1 narrows (no single-tiny-event winners), tiers stay monotonic, and low-share strong performers still out-tier high-share weak ones. Tune constants if needed.

## 4. Sync & archive

- [ ] 4.1 `/opsx:sync` the delta specs into `openspec/specs/` (via a `chore:` PR — `main` is protected).
- [ ] 4.2 `/opsx:archive` the change; update `docs/HANDOFF.md` deferred items (#7 done; note size weighting) and the `powerScore.ts` gotcha.
