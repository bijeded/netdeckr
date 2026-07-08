## Context

The grid caption and display cap are computed in `src/App.tsx`. `visibleBreakdown` (App.tsx ~L144-148) picks the displayed cards by precedence: isolated archetype → tier → default `breakdown.slice(0, GRID_DISPLAY_CAP)`. `gridCaption` (~L153-158) is `dashboard.tierCaption` under a tier filter, else `dashboard.topCaption`. Event filtering is applied upstream in `useMetagame` (the breakdown is recomputed within the event), and the selected `EventOption` (`{ id, name, eventDate }`) is available in `App` via the `events` list and `eventId` state. `formatShortDate` already formats abbreviated dates (used by `EventSelector`).

## Goals / Non-Goals

**Goals:**
- In the default popularity view, when an event is selected: caption = event name + abbreviated date, and the grid is uncapped.
- When an event and a tier are both selected: tier caption combines the tier label with the event name + date.
- No behavior change when no event is selected, nor to the isolated-archetype view.

**Non-Goals:**
- No change to share % computation, the StatCard strip, the sidebar, the archetype-isolate view, or the tier assignment.
- No schema, scraper, or dependency change.

## Decisions

- **Derive a shared `eventLabel`** in `App` from the selected `EventOption`: `date ? "${name} — ${formatShortDate(date)}" : name`, reusing the same construction as `EventSelector` (keep it DRY; a tiny inline helper is fine). `null` when no event is selected.
- **Uncap** by adding an event branch to `visibleBreakdown`: in the default (non-archetype, non-tier) view, when `eventId !== null` use the full `breakdown` instead of `.slice(0, GRID_DISPLAY_CAP)`.
- **Caption** resolves as: isolated → hidden (unchanged); tier + event → new key `dashboard.tierEventCaption` (`"{{tier}} — {{event}}"`); tier only → `dashboard.tierCaption` (unchanged); default + event → `eventLabel`; default, no event → `dashboard.topCaption` (unchanged).
- **New i18n key** `dashboard.tierEventCaption` in both `en.json` and `es.json`. Event names stay English in both locales. The existing locale-parity test covers key presence.

## Risks / Trade-offs

- The event name is user/tournament-provided text rendered into the caption; it is plain text (React escapes it) — no injection risk, and long names wrap like any caption.
- Uncapping an event view can show many cards, but a single event's archetype count is bounded (far smaller than a full window), so no perf concern.
