## Context

See proposal.md — Why. The relevant current state:

- `useMetagame(format, window, filters)` fetches a 28-day corpus once per format and derives everything client-side. `MetagameFilters` currently has a single member, `eventId`. `events.player_count` is already in the query's select list and already reaches the client on every deck row and on `EventOption.playerCount`.
- Sidebar filter groups are plain `<select>` components (`EventSelector`, `ArchetypeSelector`, `TierSelector`), each a `role="group"` with an uppercase heading and an "All …" default option.
- `App.tsx` owns each filter's `useState`, composes them into the `useMetagame` call, derives `filtersActive` for the Reset controls, and resolves cross-filter conflicts **in the selection handlers, not in effects** — the archetype/tier precedence rule works this way deliberately.
- Tiers are anchored to the whole 2-week corpus and are not affected by `eventId`; `powerScore.sizeWeight()` already weights each finish by its event's size.

Live corpus at time of writing (672 events over 30 days, 94 unsized): Small 353 / Medium 192 / Large 29 / Massive 4. Per format, Pioneer has no event above 57 players, and Standard and Pre-Modern have no Massive events.

## Goals / Non-Goals

**Goals:**

- Add size as a fifth filter dimension without changing how any existing filter derives its results.
- Keep the size↔event relationship non-contradictory by construction rather than by after-the-fact correction.
- Keep the thresholds in one place so the deferred prestige/tier work can find them.

**Non-Goals:**

- No StatCard modal for size. The three header StatCards map to the three metrics they display (Events, Archetypes, Decks); size is not one of those metrics, and inventing a fourth card is a header-layout change well beyond this filter. Size is sidebar-only, so the "Filter controls share one state" requirement is untouched.
- No per-format or adaptive thresholds. Considered and rejected below.
- No change to `sizeWeight`, tier assignment, or the scraper.

## Decisions

### Absolute, hardcoded thresholds over per-format or quantile-derived bands

Bands are fixed integers (32 / 96 / 256) applied identically in every format.

*Alternatives considered.* Per-format quantile bands would guarantee every band is populated everywhere — Pioneer's "Large" would mean something rather than being empty. Rejected because "Large" would then denote a different field size on each format tab, making the label incomparable across the app and unexplainable in a tooltip. A quantile-derived global set (thresholds at 16/32/64) partitions the current corpus far more evenly but forces calling a 64-player event "Massive", which is false. The user chose honest labels over balanced buckets, accepting that some bands read zero — the reasoning being that players already know when no large event has happened recently, so an empty Massive band is information rather than breakage.

*Consequence, accepted:* Pioneer shows two permanently empty bands. Mitigated by spec: empty bands stay selectable and lead to the standard empty state, so the UI never lies about what exists.

### `null` player_count is a distinct class, not a value on the scale

"Unsized" is a sixth selectable entry, and is included under "All sizes".

*Alternative considered.* Folding `null` into Small, which is what `sizeWeight()` does (null → the 0.35 small-event floor). Rejected for the UI: that's a scoring heuristic where a number is structurally required, whereas a filter labelled "Small" that silently contains 94 events of unknown size would be a factual claim we can't support. `eventLabel()` sets the better precedent — it omits the size rather than inventing one.

*Note the resulting asymmetry:* `sizeWeight` treats unsized as small while the filter treats it as unknown. This is deliberate and worth leaving a comment about at the threshold definition, since it will look like an inconsistency to the next reader.

### Size narrows the Event option list; conflicts resolve most-recent-wins

Size and event are the same axis at different granularities. Rather than let them contradict, an active size class filters `EventOption[]` before it reaches `EventSelector`, so an unreachable event cannot be picked in the first place.

The remaining conflict — an event is already selected, then a size excluding it is chosen — resolves **most-recent-wins**, matching the archetype/tier rule, and is implemented **in the size selection handler**, not in an effect. This mirrors how archetype/tier precedence is done and keeps the reset attributable to the user's action.

*Alternative considered.* Leaving the event list unfiltered and only resolving conflicts after the fact. Rejected: it lets the user select a combination that is guaranteed to yield an empty result, then silently undoes it.

*Interaction with the existing auto-reset effect:* App.tsx already resets `eventId` when the selected event vanishes from `events`. If `events` is narrowed by size, that effect would *also* fire and clear the selection — arriving at the same outcome by a second, uncoordinated path. The handler must be the authority; whether the existing effect needs to be scoped to avoid double-handling is an implementation detail for apply, but the two must not both claim the reset.

### Trending needs an RPC signature change — the "no schema change" scope was wrong

**This supersedes the original claim, in this design and in the proposal, that the change was frontend-only.** That claim was verified against the metagame breakdown (derived from decks in the browser, so `sizeClassOf` filters it freely) and wrongly generalized to trending. `useTrendingCards` calls the `top_cards` Postgres RPC, which returns rows already aggregated across events — there are no decks left in the client to filter, and `p_event_id bigint` narrows to exactly one event.

`top_cards` therefore gains an additive `p_event_ids bigint[]` parameter, and the client passes the size-narrowed event ids it already holds from `useMetagame`. Because the function's signature changes, it must be dropped and recreated rather than replaced in place — the same pattern the file already used when `category` was added.

*Alternative considered and rejected:* `p_min_players` / `p_max_players` plus an unsized flag, classifying in SQL. It keeps the parameter list smaller but puts the band thresholds in two languages, where they can drift apart silently — the exact failure `src/lib/eventSize.ts` exists to prevent. Passing ids keeps one source of truth.

*Rejected as unworkable:* calling the existing single-event RPC once per matching event and merging client-side. Correct arithmetic (sum copies, sum deck counts), but hundreds of round trips per filter change.

The existing `p_event_id` stays for the single-event filter, so the change is purely additive and nothing that calls the function today needs to change.

### Filter in the hook's derivation, not in the fetch

`sizeClass` joins `eventId` in `MetagameFilters` and is applied in the same per-row pass that already applies `passesEvent`. No query change, no extra fetch, consistent with every other filter.

Classification lives in a small `src/lib/eventSize.ts` alongside `eventLabel.ts` — the band constants, a `sizeClassOf(playerCount: number | null)` classifier, and the class union type — so the thresholds have one home. The trending computation reuses the same classifier rather than re-deriving bands.

### Visual treatment

The control is a `<select>` styled exactly like `EventSelector`/`TierSelector`. Reusing an existing, already-confirmed control means no new visual decisions: contrast, spacing, and focus treatment are inherited, not re-derived.

**Placement — settled by the user from a sidebar screenshot, superseding the original plan.** This design first proposed a separate sidebar group headed "Event size", placed adjacent to Event, with its position left pending a preview. That is overturned: the size select sits **inside the existing Event group**, between the "EVENT" heading and the "All events" select, and carries **no heading of its own**. Its default entry reads "All event sizes", which is what makes the control self-describing without a label. The rationale for the original — that every filter group in the sidebar has a heading — is outweighed by the two controls being the same axis at different granularities: one heading over both states that relationship structurally, and the sidebar screenshot showed heading-per-control would read as five peer filters rather than four.

*Accessibility consequence of dropping the visible heading:* the select must still carry a localized `aria-label`, since it no longer inherits an identifying heading and would otherwise be announced only as a combobox indistinguishable from the event select beside it. The spec requires this.

The remaining density question is also resolved by the screenshot: the sidebar has substantial unused vertical space below "Clear filters", so one added select does not crowd the 280px column. **Still pending visual confirmation on the Vercel preview:** the vertical rhythm between the two selects inside the shared group — whether they need tighter spacing than the gap between groups to read as one unit — which only an eye can settle.

## Risks / Trade-offs

- **Empty bands look like a bug to a first-time user** → Bands stay selectable and render the standard localized empty state, so the result is legible rather than silent. Accepted deliberately (see Decisions); revisit only if the preview shows it reading as breakage.
- **Two mechanisms could both reset `eventId`** (the size handler and the existing auto-reset effect) → Make the handler authoritative; verify with a test that selecting an excluding size clears the event exactly once and applies the size, rather than the two paths racing.
- **Size and prestige get conflated by users** — a 24-player Worlds files under Small next to an FNM → Not solvable with `player_count`; the prestige axis is deferred to its own change. Not currently visible, since the corpus contains no premier events.
- **`filtersActive` and "clear filters" enumerate the filters in several places** → Adding a fifth dimension means every such site must be updated together; a missed one leaves Reset disabled while a size filter is active. Spec covers this with an explicit scenario.
- **Threshold drift** — MTGTop8's event mix could shift enough to make the bands unrepresentative → Constants in one module make re-tuning a one-line change; no data is stored against a band, so re-tuning is not a migration.

## Migration Plan

None required. Client-side, additive, no schema or stored data. The filter defaults to "All sizes", so an unchanged default view is byte-identical to today's. Rollback is a revert.

## Open Questions

- The vertical spacing between the two selects inside the shared Event group — whether they need tighter spacing than the between-group gap to read as one unit. Deferred to the Vercel preview; does not change the specs, the approach, or the task breakdown.
