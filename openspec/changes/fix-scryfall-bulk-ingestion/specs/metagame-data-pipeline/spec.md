## MODIFIED Requirements

### Requirement: Scheduled daily execution
The scraper SHALL run **twice a day** via GitHub Actions (two runs roughly 12 hours apart), authenticating to Supabase with the service-role key provided via repository secrets. Within each of the two daily runs it SHALL run one job per format on staggered schedules (rather than a single job covering all formats at once) so that load on the source is spread out; each scheduled run SHALL scrape exactly one format. A manual trigger SHALL still be able to run a single format or all formats on demand.

A scheduled run SHALL report success only when the work it was scheduled to do actually completed. In particular, a run that could not enrich scraped cards with Scryfall data SHALL report failure, so that a successful run is a reliable signal that decklists were both scraped and enriched. Failures arising from an upstream data-source change SHALL be visible in the run's status, not only in its logs.

#### Scenario: Two staggered per-format bands each day
- **WHEN** the pipeline runs on its schedule
- **THEN** each of the five formats is scraped by its own job at its own staggered time, in each of the two daily bands (~12 hours apart), each authenticating with the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets

#### Scenario: Manual trigger scrapes a chosen format or all
- **WHEN** the workflow is triggered manually
- **THEN** it scrapes the requested single format, or all formats when none is specified

#### Scenario: Enrichment failure fails the run
- **WHEN** a scheduled run cannot obtain Scryfall card data
- **THEN** the workflow run is reported as failed rather than successful
