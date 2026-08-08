## Context

See proposal.md — Why. All figures below are measured over the live corpus as of 2026-08-07: 672 events, 5,685 decks.

Current calibration in `src/lib/powerScore.ts`:

```
SIZE_REF        = 64     // reference field: weight ≈ 1
SIZE_WEIGHT_MIN = 0.35   // floor: tiny events AND unsized events
SIZE_WEIGHT_MAX = 2.5    // cap
sizeWeight(s)   = clamp(s / SIZE_REF, MIN, MAX)
```

`sizeWeight` has exactly one production call site, `archetypePowerScore()` at `powerScore.ts:120`, which weights each finish's contribution to the Wilson effective sample size. The function is pure and unit-tested; nothing else in the app reads it.

## Goals / Non-Goals

**Goals**
- Keep the sub-reference weight curve bit-identical, so the change's blast radius is confined to the 68 events (10.1%) above the reference.
- Make the unranked classification derivable from data already loaded client-side — no schema change, no new scraped field.
- Produce a measured before/after tier diff as the acceptance gate, not a reasoned assurance that tiers won't move.

**Non-Goals**
- Re-tuning `SIZE_WEIGHT_MIN`, `Z_DEFAULT`, `TREND_EPS`, or `T1_MIN_DECKS`. Changing several calibration constants at once would make the tier diff unattributable.
- Event prestige / `event_level`. Deferred, per proposal.
- Any change to how the 8 genuine unsized paper tournaments are weighted.

## Decisions

### D1. Logarithmic above the reference, linear at or below it

```
w = s / SIZE_REF                    for s ≤ SIZE_REF
w = 1 + log₂(s / SIZE_REF)          for s > SIZE_REF
w = clamp(w, SIZE_WEIGHT_MIN, SIZE_WEIGHT_MAX)
```

Continuous at `SIZE_REF` — both branches evaluate to exactly 1.0 — so there is no seam to justify or test around.

Measured effect on the corpus:

| players | 32 | 64 | 96 | 128 | 256 | 512 | 1086 |
|---|---|---|---|---|---|---|---|
| current | 0.50 | 1.00 | 1.50 | 2.00 | **2.50** | **2.50** | **2.50** |
| proposed | 0.50 | 1.00 | 1.58 | 2.00 | 3.00 | 4.00 | 5.00 |

| band | current weight range | proposed |
|---|---|---|
| small (n=353) | 0.35 – 0.48 | 0.35 – 0.48 *(unchanged)* |
| medium (n=192) | 0.50 – 1.48 | 0.50 – 1.57 |
| large (n=29) | 1.50 – 2.50 | 1.58 – 2.95 |
| massive (n=4) | **2.50 – 2.50** | **3.42 – 5.00** |
| unsized (n=94) | 0.35 | 0.35 *(unchanged)* |

**Alternatives considered.** Raising the linear cap does not work: a cap of 4.0 binds at exactly 256 — the Massive floor — so Massive still collapses to one value, and separating a 1086-player event linearly needs a cap near 17, at which point a single event genuinely does dominate the field. `sqrt(s / SIZE_REF)` also separates the large events, but it rescales the entire curve including the 545 sub-reference events whose current calibration is well-tested and not in question.

### D2. Cap raised to 6.0 and reframed as a data-sanity guard

Logarithmic growth is self-limiting, which was `SIZE_WEIGHT_MAX`'s stated purpose ("one huge event can't dominate the field"). Its remaining job is bounding an implausible scraped `player_count` (a misparse yielding `99999`). 6.0 binds at 4096 players — roughly 4× the largest event in the corpus.

5.0 was considered and rejected: the existing 1086-player Paupergeddon would sit exactly on it, reintroducing the saturation this change exists to remove.

### D3. Unranked detection is structural, evaluated per event

An event is unranked when **both** hold:
1. no placement among its decks contains a bracket range (a `-`), and
2. the event has no recorded `player_count`.

Measured: this selects exactly the 86 `MTGO League` events and nothing else.

**Alternatives considered.** Matching `name = 'MTGO League'` is brittle against an upstream label change and would miss equivalent ladders under other names. Using the missing-player-count signal alone is wrong: all 8 genuine unsized events (RCQs, F2F qualifiers, local stages) carry real bracket placements and must keep their standings-derived scoring. Using the no-bracket signal alone risks catching a small real tournament that happens to publish only flat positions — the conjunction with missing-size is what makes it safe, since no `MTGO League` in the corpus has ever reported a size (0 of 86).

Both signals are already in memory: `decks.placement` and `events.player_count` are loaded by the existing metagame query. No schema change, no RPC change, no scraper change.

### D4. Flat quality for an unranked deck: 0.45

Today's League distribution, and what it becomes:

| finish quality | current League decks | proposed |
|---|---|---|
| 1.00 (champion) | 86 | 0 |
| 0.80 (finalist) | 86 | 0 |
| 0.65 (top 4) | 170 | 0 |
| 0.45 (top 8) | 311 | **653** |
| mean | **0.621** | **0.450** |

0.45 is the existing top-8 quality: a 5-0 League run is a real achievement earned against a self-selected field with no elimination bracket, which is roughly top-8 grade and clearly not champion grade. Reusing an existing constant rather than introducing a new tuned one keeps the calibration surface from growing.

This value is a calibration parameter, not a spec requirement — the spec only requires that it be flat and below first-place quality. If the tier diff in T4 shows it over- or under-corrects, adjusting it is a one-constant change that does not touch the specs.

### D5. Threading the signal into `archetypePowerScore`

`archetypePowerScore(placements, sizes?)` currently takes two index-aligned arrays. The unranked flag is a third per-finish input. Two shapes were considered:

- **Add a third parallel array** (`unranked?: boolean[]`) — consistent with the existing `sizes` parameter and its documented index-alignment contract, but a third parallel array is where that pattern starts to strain.
- **Take one array of finish records** (`{ placement, size, unranked }[]`) — better shape, but it is a breaking signature change to a function with an established test suite, and it would mix a refactor into a calibration change whose whole verification story depends on attributing tier movement to one cause.

**Decision: the third parallel array**, keeping the refactor separate. Noting here that a fourth input should force the record shape rather than a fourth array.

## Risks / Trade-offs

- **Tier badges move on merge, with no staging environment** → The T4 tier diff runs before the PR is opened, and Vercel-preview confirmation gates the merge (exception 1). If the diff is larger than expected, D4's constant is the tuning knob.
- **The no-bracket heuristic could catch a real tournament in future data** → The conjunction with missing-size makes this narrow, and the failure mode is graceful: a real event's decks would be flattened to 0.45 rather than dropped. Worth a periodic re-check as the corpus grows, not a blocker.
- **0.45 is a judgement call, not a measurement** → It is isolated to one named constant and changing it touches no spec. Called out as the most likely thing to revisit.
- **`log₂` changes weights for the 6 events that currently sit on the cap, which are the highest-signal events in the corpus** → This is the intended effect, but it means the largest events gain influence at the same moment Leagues lose it. The tier diff must be read as the net of both; if attribution matters, run it once per change in isolation.
- **Two calibration changes in one release** → Accepted deliberately (user's call: same proposal). T4 mitigates by reporting the diff for each change independently as well as combined.

## Migration Plan

No data migration — the Power Score is derived at read time on every load, so the new calibration takes effect for all windows the moment the bundle deploys. Rollback is a revert of the code change; no stored artifact is affected.

## Open Questions

None that block implementation. D4's constant is the one value expected to be revisited, and T4 is where the evidence to revisit it comes from.
