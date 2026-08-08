## Why

Two calibration defects in the Power Score surfaced while adding the event-size filter, both measured against the live 672-event / 5,685-deck corpus:

1. **The size-weight cap erases the top of the scale.** `SIZE_WEIGHT_MAX = 2.5` binds at 160 players — *inside* the Large band — so every Massive event (256 … 1086 players) receives an identical weight. The filter now offers users a size class the scorer cannot see the top of.
2. **MTGO Leagues contribute fabricated podiums.** An MTGO League is a 5-match ladder with no ranking; MTGTop8 publishes every 5-0 deck and stores them as a flat `1 · 2 · 3 · 4 · 5 · 6 · 7 · 8`, where a real tournament stores brackets (`3-4`, `5-8`, `17-32`). `finishQuality()` reads those row numbers positionally, so each of the 86 Leagues in the corpus manufactures one champion (1.0) and one finalist (0.8). Across 653 decks — **11.5% of the corpus** — League decks average a finish quality of **0.621** against **0.550** for real tournaments. They are currently over-credited on ordering that does not exist.

Defect 2 is the one that moves tiers today. Defect 1 is calibration for correctness: it changes nothing until a Massive event lands, and then it matters.

## What Changes

- **Logarithmic size weighting above the reference.** Weight stays `size / SIZE_REF` up to the reference and becomes `1 + log₂(size / SIZE_REF)` above it (continuous at the reference — both sides give exactly 1.0). Each doubling of field size adds 1.0. Massive becomes a real interval (3.42 – 5.00) instead of a single saturated point. Weights below the reference are **bit-identical** to today, so 604 of 672 events are untouched; only the 68 events above the reference change.
- **The weight cap is reframed as a data-sanity guard**, raised from 2.5 to 6.0 (binds at 4096 players). Logarithmic growth is self-limiting, which was the cap's original job ("one huge event can't dominate the field"); its remaining purpose is guarding against an implausible scraped `player_count`. At 5.0 the existing 1086-player event would already sit on the cap, reintroducing the saturation being removed.
- **Unranked-event handling.** An event whose placements are a flat run with no bracket range **and** which has no recorded player count is treated as **unranked**: every one of its decks receives a single flat finish quality instead of a ranked one derived from its row number. The decks are kept — a 5-0 League run is a genuine result — but the invented ordering is discarded.
  - Detection is **structural, not by event name**. Matching `name = 'MTGO League'` would be brittle; the missing-player-count signal alone would wrongly catch the 8 genuine unsized paper tournaments (RCQs and local stages), all of which do carry real bracket placements. The conjunction selects exactly the 86 Leagues in the current corpus and nothing else.
- **No change to the unsized weight floor.** The 8 genuine unsized tournaments keep the conservative small-event default; they are small paper events with top-4/top-8 brackets, which is what the floor already assumes.
- **BREAKING (visible output, not API):** tier badges may move. Removing the League over-credit withdraws inflated finish quality from 11.5% of decks. Tier cutoffs are Jenks-clustered relative to the field, so much of this cancels — but it must be measured, not assumed.

Explicitly **not** in scope: event prestige / MTGTop8 star rating (`event_level`), which is the orthogonal axis that would stop a 24-player Worlds filing under "Small". It remains deferred to its own change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `metagame-breakdown-view`: **Tournament-size weighting of the Power Score** — the weighting curve's stated shape changes from "scales with player count, capped" to a logarithmic-above-reference growth in which each doubling of field size adds a fixed increment, so distinct very-large events remain distinguishable rather than saturating at a shared ceiling.
- `metagame-breakdown-view`: **Placement-derived Power Score inputs** — adds the rule that an event whose standings are not a genuine ranking contributes a single flat finish quality per deck rather than standings-derived quality, so a published-ladder event cannot manufacture a champion.

## Impact

- **Code:** `src/lib/powerScore.ts` — `sizeWeight()` and its calibration constants (`SIZE_REF`, `SIZE_WEIGHT_MAX`), plus the `finishQuality` application path in `archetypePowerScore()`, which gains per-event rather than purely per-placement input. One production call site today (`powerScore.ts:120`). The caller that assembles placements and sizes per archetype must additionally supply the unranked signal.
- **Tests:** `src/lib/powerScore.test.ts` — existing property tests are documented as independent of the exact constants and should hold; tests pinning specific `sizeWeight` values need new expectations.
- **Supabase / RLS:** none. No schema change, no new column, no policy change. The unranked signal is derived at read time from `decks.placement` and `events.player_count`, both already loaded.
- **Scraper:** none. No change to what is fetched or stored.
- **Time-window model and 30-day retention:** unchanged.
- **Unaffected by construction:** metagame share percentages, header StatCard totals, trending tables, and decklists — this change touches only Power Score and the Tier badge derived from it.
- **Blast radius:** the Tier badge on every archetype card, plus the tier filter and any tier-derived caption. User-visible, so merge exception 1 applies — Vercel preview confirmation before merge, and a before/after tier diff over live data as the verification gate.
