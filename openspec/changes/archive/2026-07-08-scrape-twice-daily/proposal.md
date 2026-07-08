## Why

The scraper runs once a day (a single ~12:00 UTC band of staggered per-format jobs). We want fresher data — **twice a day, ~12 hours apart**, targeting **6:00 AM and 6:00 PM UTC-6** (a fixed offset; the operator's zone does not observe DST). A second daily run halves the staleness of the metagame breakdown between refreshes.

## What Changes

- Add a **second staggered band** of scheduled runs so each format is scraped twice a day instead of once. The existing single band is retimed and a mirror band is added ~12 hours later.
- **Compensate for GitHub Actions' cron delay.** Scheduled workflows on this repo fire ~2–4 h late (observed: a 12:00 UTC schedule started 14:07–16:17 UTC across recent days), so the current run — correctly 6:00 AM UTC-6 on paper — is seen at ~8–9 AM. To land the *actual* runs near the target wall-clock times, the crons are scheduled ~2 h **earlier** than the desired landing: morning band at **10:00–11:00 UTC** (targets ~12:00 UTC ≈ 6 AM UTC-6), evening band at **22:00–23:00 UTC** (targets ~00:00 UTC ≈ 6 PM UTC-6). Because GitHub's delay is variable, actual times will still drift within roughly a 2-hour window — this is documented, not eliminated.
- Extend the workflow's `Resolve format` `case` block so every new cron maps to its format (an unmapped scheduled cron already fails the run loudly).
- Keep the workflow name (`Daily scrape`) and the `daily-scrape-` concurrency prefix **unchanged** (avoid Actions-history churn); only update the "daily" wording in the docs to "twice daily".

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-data-pipeline`: the "Scheduled daily execution" requirement becomes twice-daily — two staggered per-format bands ~12 h apart, each format scraped once per band.

## Impact

- `.github/workflows/scrape.yml` — the `on.schedule` cron list (5 → 10 crons) and the `Resolve format` `case` mapping (5 → 10 arms).
- Docs: `CLAUDE.md` and `docs/HANDOFF.md` "daily" schedule wording → "twice daily" (and the new times).
- No code, schema, or dependency change. Retention prune and the date-keyed Scryfall cache are unaffected (both bands fall on the same UTC calendar day → still ~1 bulk download/day; the prune is idempotent and simply runs twice).
