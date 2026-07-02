## Why

MTGTop8 renders the same archetype's name with different capitalization on different pages: the metagame breakdown page says `UW Control`, but the event decklist results table title-cases it as `Uw Control`. Because the archetype get-or-create upsert matches on the exact `name` and the `unique(format_code, name)` constraint is case-sensitive, the decklist scrape spawns a **second, duplicate archetype row** for the same archetype. That duplicate has no metagame snapshot, so it never appears in the breakdown grid — and any decks attached to it are stranded and invisible in the UI (the "missing decks" symptom). A read-only audit found 7 collision groups → 10 duplicate rows → ~30 stranded decks across formats.

## What Changes

- Normalize archetype names to a canonical form so the breakdown scrape and the decklist scrape resolve to the **same** archetype row regardless of MTGTop8's per-page capitalization.
- Make archetype identity **case-insensitive** at the schema level so a case-variant name can never create a duplicate row (`unique(format_code, lower(name))`), while preserving the human-preferred display casing.
- **Data migration**: merge existing duplicate archetype rows (re-point their decks/snapshots to the canonical row, delete the orphan), keeping the casing that appears in the metagame breakdown as canonical.
- Reproduce the defect with a saved MTGTop8 event-page fixture (decklist results table) and a failing scraper test before fixing.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: archetype get-or-create must match case-insensitively and store a single canonical name per `(format, archetype)`; case-variant scrapes must not create duplicate archetype rows.

## Impact

- **Scraper**: `scraper/mtgtop8.py` (archetype name handling) and the archetype upsert path in the Supabase write layer (`scraper/run.py` / PostgREST upsert).
- **Schema**: `supabase/schema.sql` — case-insensitive uniqueness on `archetypes(format_code, name)` (functional unique index on `lower(name)`), applied as a migration; validate with **pglast**, not sqlglot.
- **Data**: one-time cleanup migration merging duplicate archetype rows and re-pointing `decks.archetype_id` / `metagame_snapshots.archetype_id`. Requires the service-role key (human/CI step).
- **Tests**: new pytest fixture + failing-first test for the decklist archetype name; no live MTGTop8 in CI.
- **Frontend**: none — reads improve automatically once duplicates are merged.
