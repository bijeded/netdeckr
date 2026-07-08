## Why

When a single event is selected in the Event filter, the grid still reads "Top N most popular archetypes" and is capped at 12 cards — but within one event that framing is misleading (it's that event's field, not a popularity ranking) and the cap can hide archetypes that appeared at the event. Naming the event and showing its full field makes the event-filtered view honest and complete.

## What Changes

- In the default popularity view, when an event is selected, the grid caption reads the **event name + abbreviated date** (e.g. "Standard Challenge — 24 Jun 2026") instead of "Top N most popular archetypes".
- In the default popularity view, when an event is selected, the archetype grid is **uncapped** (shows every archetype in that event, not just the top 12).
- When an event **and** a tier are both selected, the tier caption **combines** the tier label with the event name + date (e.g. "Tier 1 — Standard Challenge — 24 Jun 2026").
- Isolated-archetype view is unchanged (caption stays hidden); the no-event popularity view and no-event tier view keep their existing captions.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `metagame-breakdown-view`: the grid caption and display cap become event-aware — the default popularity view names the selected event and uncaps its grid, and the tier caption folds in the selected event.

## Impact

- Frontend only: `src/App.tsx` (caption + `visibleBreakdown` cap logic), `src/locales/en.json` + `src/locales/es.json` (new `dashboard.tierEventCaption` key).
- No schema, scraper, dependency, or data-model change. Event names stay English in both locales (proper nouns).
