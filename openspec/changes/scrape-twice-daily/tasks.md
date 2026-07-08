## 1. Twice-daily schedule

- [x] 1.1 In `.github/workflows/scrape.yml`, replace the single 12:00–13:00 UTC cron band with two staggered bands: morning `0 10`/`15 10`/`30 10`/`45 10`/`0 11` and evening `0 22`/`15 22`/`30 22`/`45 22`/`0 23`, each mapping ST/PI/MO/PAU/PREM. Update the band comment to explain the ~2 h earlier compensation for GitHub's cron delay and the UTC-6 target times.
- [x] 1.2 Extend the `Resolve format` `case` block to 10 arms so every new cron resolves to its format (keep the unmapped-cron fail-loud default).

## 2. Docs and verification

- [x] 2.1 Update the "Data pipeline" schedule wording in `CLAUDE.md` from daily/12:00–13:00 UTC to twice daily with the two new bands and target UTC-6 times.
- [x] 2.2 Update `docs/HANDOFF.md` (project overview / gotchas) so any "daily" scrape references reflect the twice-daily schedule.
- [x] 2.3 Sanity-check the YAML (valid syntax; 10 crons ↔ 10 case arms in lockstep) and confirm `on.workflow_dispatch` is unchanged.
