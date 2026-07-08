## 1. Event-scoped caption and uncapped grid

- [x] 1.1 Add the `dashboard.tierEventCaption` key (`"{{tier}} — {{event}}"`) to `src/locales/en.json` and `src/locales/es.json` (keep locale parity).
- [x] 1.2 In `src/App.tsx`, derive a shared `eventLabel` (event name + abbreviated date via `formatShortDate`, or name only when no date) from the selected `EventOption`; `null` when no event is selected.
- [x] 1.3 In `src/App.tsx`, add an event branch to `visibleBreakdown` so the default (non-archetype, non-tier) popularity view is uncapped when an event is selected.
- [x] 1.4 In `src/App.tsx`, update `gridCaption`: default+event → `eventLabel`; tier+event → `dashboard.tierEventCaption`; tier-only and default-no-event captions unchanged; isolated archetype still hides the caption.

## 2. Tests and verification

- [x] 2.1 Add/extend `App` tests: event selected → caption is the event label and the grid shows all event archetypes (uncapped); event + tier → combined caption; no-event popularity and tier captions unchanged.
- [x] 2.2 Confirm the locale-parity test covers `dashboard.tierEventCaption`.
- [x] 2.3 Run `npm run lint`, `npm run type-check`, and `npm run test`.
