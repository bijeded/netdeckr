## Why

The performance-based Tier badge scores every deck finish equally, regardless of the tournament it came from — a Top 8 at a 20-player local counts the same as a Top 8 at a 200-player Challenge. With the tier reference field now the whole 2-week corpus (`retune-breakdown-cap-and-tier-field`), large formats show a **broad Tier 1** (Pauper 24, Modern 17 archetypes) inflated by single-deck archetypes that won their only, tiny event. Weighting each finish by the tournament's size gives the Power Score real statistical rigor and makes Tier 1 a trustworthy signal again.

## What Changes

- Capture each MTGTop8 event's **player count** in the pipeline: parse it from the event page and store it on `events` (new nullable `player_count` column, additive — no migration of existing rows required). Many events do not display a size; those stay `null`.
- Weight the Power Score by tournament size: a deck's finish contributes **effective Wilson observations proportional to its event's size**, so finishes proven against a larger field shrink less and small-event finishes shrink harder. An event with no recorded size is treated as a **small event** (conservative small-size default), never dropped.
- Tighten Tier 1: fold in the deferred small-sample calibration (raise `Z_DEFAULT` and/or add a **minimum-deck floor for T1 eligibility**) so single-tiny-event winners no longer flood the top tier. Tier order stays monotonic in Power Score.
- Metagame **share %**, StatCard totals, trending, and decklists are unchanged — size weighting affects only the Power Score / Tier badge, preserving the existing "share = popularity, score = performance" split.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: the scraper parses and persists each event's player count (`events.player_count`, nullable), idempotently updated on re-scrape and never overwritten to null; schema gains the additive column.
- `metagame-breakdown-view`: the Power Score / Tier badge is weighted by tournament size (size raises a finish's effective Wilson `n`; missing size defaults to small), and Tier 1 eligibility is tightened with a harsher small-sample penalty and/or a minimum-deck floor.

## Impact

- **Schema:** `supabase/schema.sql` — add `events.player_count integer` (nullable). Manual apply via service-role key (idempotent), per the schema-deploy dance.
- **Scraper:** `scraper/mtgtop8.py` (parse player count from the event page), `scraper/supabase_writer.py` (persist/update `player_count`), plus fixtures + pytest.
- **Frontend:** `src/lib/powerScore.ts` (size-weighted effective `n`, tuned `Z_DEFAULT` / min-deck T1 floor), `src/hooks/useMetagame.ts` and `src/lib/metagame.ts` (thread event `player_count` onto decks so the score can read it), Vitest.
- **Sequencing:** cross-stack contract (schema + scraper + frontend). Frontend must default a null/absent size to small **before** relying on it, so every intermediate state on `main` is safe (same pattern as `derive-metagame-from-decks`). No new dependencies; no history table; 30-day retention untouched.
