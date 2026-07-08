## Context

`.github/workflows/scrape.yml` schedules 5 staggered crons (one per format) in the 12:00–13:00 UTC band, and the `Resolve format` step maps each exact cron string (`github.event.schedule`) to a format via a `case`. An unmapped scheduled cron fails the run loudly. The workflow is `name: Daily scrape`, concurrency group `daily-scrape-${{ github.event.schedule || … }}`.

**Observed GitHub cron delay (grounding the offset):** scheduled 12:00–13:00 UTC runs actually started 14:07–15:42 UTC (2026-07-08), 14:33–15:42 UTC (2026-07-07), ~16:00+ UTC (2026-07-06) — a **variable ~2–4 h delay**. So the on-paper 6:00 AM UTC-6 run is seen ~8–9 AM. The operator is at a **fixed UTC-6** (no DST).

## Goals / Non-Goals

**Goals:**
- Scrape each format twice a day, ~12 h apart.
- Bias the *actual* (post-delay) run times toward ~6 AM and ~6 PM UTC-6.
- Keep the resolver/case contract intact and fail-loud on an unmapped cron.

**Non-Goals:**
- Eliminating GitHub's cron delay (not possible) or its variance.
- Renaming the workflow / concurrency group (operator chose docs-only wording update).
- Any code, schema, or dependency change.

## Decisions

- **Two bands, same 15-min stagger and same slot→format order** as today:
  - Morning band (targets ~12:00 UTC land ≈ 6 AM UTC-6): `0 10`, `15 10`, `30 10`, `45 10`, `0 11` → ST, PI, MO, PAU, PREM.
  - Evening band (targets ~00:00 UTC land ≈ 6 PM UTC-6): `0 22`, `15 22`, `30 22`, `45 22`, `0 23` → ST, PI, MO, PAU, PREM.
- **~2 h earlier compensation.** Desired landings are 12:00 and 00:00 UTC; scheduling at 10:00 and 22:00 UTC subtracts the observed ~2 h delay floor. Delays run 2–4 h, so worst-case days still land late — subtracting more would fire low-delay days hours early. This is a deliberate best-effort bias, documented in a workflow comment so a future reader does not "correct" it back to 12:00/00:00.
- **`case` mapping extended to 10 arms** — the 5 new crons map to the same formats as their morning counterparts. Both files-of-truth (the `on.schedule` list and the `case`) stay in lockstep; a missed arm fails the run.
- **Names unchanged; docs updated.** `CLAUDE.md` (data-pipeline schedule line) and `docs/HANDOFF.md` reword "daily"/"12:00–13:00 UTC" to twice-daily with the new bands.

## Risks / Trade-offs

- **Timing variance remains.** GitHub's 2–4 h delay means actual runs drift within ~a 2 h window (roughly 6–8 AM / 6–8 PM UTC-6). Accepted per the operator's choice to compensate; the alternative (off-peak minutes) was declined.
- **Cache/prune:** both bands share a UTC calendar day, so the date-keyed Scryfall bulk cache still downloads ~once/day; the 30-day prune simply runs twice and is idempotent. No action needed.
- **Concurrency:** morning-ST and evening-ST are distinct concurrency groups (different cron strings) but are ~12 h apart, so no same-format overlap occurs.
