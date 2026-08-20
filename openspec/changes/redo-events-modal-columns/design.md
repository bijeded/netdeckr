## Context

See `proposal.md` — Why. The constraint that shapes this design is that `FilterModal` is deliberately generic: its own doc comment states it "renders rows it is given and knows nothing about events, archetypes, or tiers." All three StatCard modals share it, so a change made for the Events modal has to be expressible as a capability the other two simply do not use.

Its current column model, from `dashboard.css`:

```
┌──────────────────────┬───────────┬──────────────────┬────────────┐
│ content              │ aside     │ metaSecondary    │ meta       │
│ flex: 1 1 auto       │ 62px      │ min 88px, mono   │ min 58px   │
│ grows                │ fixed     │ right-aligned    │ mono right │
└──────────────────────┴───────────┴──────────────────┴────────────┘
```

Every column after `content` is fixed-width and reserved list-wide as soon as any row uses it — that is how the archetype modal's tier badges already form a clean band instead of trailing each name. The target layout needs the same reservation, but for a column *before* `content`, which the component has no slot for.

The other shaping constraint: `src/lib/eventLabel.ts` composes the flat string this modal uses today, and it is shared with two other callers — the header caption (`App.tsx:180`) and the sidebar `EventSelector` dropdown, whose `<option>` elements can hold nothing but text. Both still need the composed form.

## Goals / Non-Goals

**Goals:**

- Express the change as two additive, optional capabilities on `FilterModal`, so the Archetypes and Decks modals are untouched by construction rather than by care.
- Keep column alignment the component's responsibility, as it already is for `aside` and the two figure columns.

**Non-Goals:**

- Refactoring or splitting `eventLabel.ts`. It keeps its two remaining callers unchanged.
- Any responsive behavior beyond what the existing row already does. The row does not wrap today and must not start.
- Cleaning up the `metaSecondary` drift noted in the proposal.

## Decisions

### Add a leading column slot rather than composing inside `content`

`FilterModalRow` gains `lead?: ReactNode`, rendered before `content` and reserved list-wide whenever any row supplies it — the same `rows.some(...)` test the component already applies to `aside` and `metaSecondary`.

*Alternative considered:* compose the date and name into `content` as a nested two-cell grid in `App.tsx`. Rejected because alignment across rows would move out of the component and into the one caller, re-solving a problem `FilterModal` already solves for three other columns — and solving it in a place where the row's own padding and gaps are not visible.

### The "All events" row spans, and does so by an explicit flag

`FilterModalRow` gains `fullWidth?: boolean`. When set, the row renders `content` alone across the full width, skipping `lead`, `aside`, and both figure cells.

*Alternative considered:* infer it — a row supplying neither `lead` nor `meta` spans. Rejected: the archetype modal's "All archetypes" row already supplies no `meta` by design (its comment explains the share of every archetype together is not worth printing), so inference would silently restyle a modal this change is not meant to touch.

*Why span at all rather than em-dash the empty cells:* the em dash is being given a specific meaning here — "the data does not record this." "All events" is not an event with unreported facts; the columns do not apply to it. Reusing the dash would overload it in the row the eye reaches first.

### The player count goes in `meta`

It is a figure, and `meta` is already the mono, right-aligned figure column. No new column is needed for it, and it inherits the mono treatment the project applies to all data. It reuses the existing `dashboard.eventSize` translation key (count-aware, already used by `eventLabel`), so no new string is added for the populated case.

### The em dash is a literal, with no translation key and no `aria-label`

`—` is locale-neutral, so no ES/EN string is required. Deliberately not adding an `aria-label` saying "unknown": it would need a new key in both locales and would make the row's accessible name diverge from its visible text, and the dash's meaning is legible from the column it sits in.

*This is a reversible call.* If screen-reader review finds the bare dash unclear, adding the label later is additive and touches only the row builder.

### The date column's exact width is deferred

`formatShortDate` yields short, stable output ("14 Aug" / "14 ago"), so a fixed lead column is calculable in principle. The exact px value is not settled here — per project practice it is set against the Vercel preview and recorded back into this document once confirmed, rather than guessed now.

## Risks / Trade-offs

**Two new optional fields on a shared component widen its surface** → Both are additive and default off; the other two modals pass neither and render identically. `FilterModal.test.tsx` already covers the tier and archetype row shapes, so an unintended change to them fails a test rather than reaching the preview.

**Three columns in a 520px modal is tighter than two** → The row must not wrap. Whether it does at the narrowest supported viewport, once the date column is added on the left, is **pending visual confirmation on the Vercel preview** — it is not established by this design. The name column is the flexible one (`flex: 1 1 auto`, `min-width: 0`), so it absorbs the pressure and can ellipsize; that mechanism exists in the archetype rows already.

**Removing the deck count removes information some user may have been reading** → Accepted deliberately; see `proposal.md` — Why. The per-event deck count remains obtainable by selecting the event, which narrows the whole dashboard to it and puts that number on the Decks StatCard.

**`decks` and `windowDecks` are removed as unused** → Verified as used only by `eventRows`; `npm run lint` and `npm run type-check` catch it if that reading is wrong.

**The change is user-visible with no staging environment** → Per the project's merge rules this is exception 1: open the PR and wait for confirmation on the Vercel preview before merging.
