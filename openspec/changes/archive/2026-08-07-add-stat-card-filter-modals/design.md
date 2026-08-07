## Context

See proposal.md — Why. The relevant current state:

- The three filters (`eventId`, `archetypeName`, `tier`) are plain `useState` in `App.tsx`, passed down to `EventSelector`, `ArchetypeSelector`, and `TierSelector`, which are each a controlled native `<select>`. Nothing else owns this state.
- `StatCard` is a presentational value+label box with no interactivity.
- `stripTotals` in `App.tsx` already recomputes the three metrics from the *filtered* decks when an archetype or tier filter is active.
- `DecklistModal` already implements the project's dialog pattern: overlay, `role="dialog"` + `aria-modal`, Escape to close, focus moved in on open and restored to the trigger on close.
- Two existing filter interactions must survive: the archetype filter resets a contradictory tier filter, and a selected archetype or event auto-resets when it disappears from the corpus.

Visual claims below are marked as either **calculated** (derivable from tokens and existing CSS) or **pending preview** (only an eye can settle them on the Vercel preview).

## Goals / Non-Goals

**Goals:**

- One shared filter state with two equivalent entry points, with no synchronisation code.
- A modal row that can carry information a native `<option>` cannot — dates, deck counts, share, tier badges, mana pips — since that richness is the entire reason for choosing a modal over making the card a `<select>`.
- Reuse the existing dialog behavior rather than reimplementing focus trapping and dismissal.

**Non-Goals:**

- Replacing the sidebar `<select>`s with the new picker. They stay as they are; the modal is an additional entry point, not a migration. Whether the sidebar eventually adopts the same picker is a separate future decision.
- Search or type-ahead inside the modals.
- Persisting filters in the URL — explicitly excluded by the existing "Filters do not persist across reloads" requirement.

## Decisions

### Modal over making the StatCard a native `<select>`

Considered making each card a transparent `<select>` overlaying the card, which would give the native mobile picker for free. Rejected: the interaction cost is identical (tap card → list → tap option, two taps either way), so the only difference is what a row can express — and a native `<option>` is one line of unstyleable plain text, while the desktop rendering of a native select popup cannot be brought in line with the dark telemetry look. The modal wins on row richness at no extra tap.

Also considered opening the sidebar drawer focused on the relevant filter. Rejected: it is the only option that genuinely adds a step (card → drawer → select → option).

### One modal component, three configurations

A single generic dialog component renders a list of rows; the three call sites supply their own rows and row rendering. This keeps dismissal, focus handling, and chrome in one place, and prevents the three modals from drifting apart. It is built as a standalone component (not baked into the stat strip) so that a future decision to reuse it for the sidebar does not require extracting it later.

It follows `DecklistModal`'s pattern — centred overlay, Escape, focus in/restore — rather than introducing a bottom-sheet variant on mobile. A sheet is arguably the stronger mobile pattern, but it is a second dialog idiom and a second set of CSS for a dashboard that currently has exactly one; consistency with the existing modal was chosen over the marginally better mobile gesture. This can be revisited after the preview.

### Each modal breaks down its card's number, ignoring its own filter

The unifying rule: a card's number expands into the breakdown of that number, and picking a row filters to it. This is what makes Decks → tiers coherent rather than arbitrary — the tier list *is* 730 decks grouped, and the row counts account for the card's total.

The rule has one necessary exception. `stripTotals` already narrows the card's number under an active filter, so with Tier 2 selected the Decks card reads the Tier 2 subtotal. If the tier modal broke down *that* number it would list one tier and the user could never switch. So: **a modal computes its rows over the corpus narrowed by the other active filters, never by its own.** Consequence, stated plainly so it is not implemented as a bug: when a filter is active, its own modal's row counts will not sum to the number on its card. That is correct.

### Archetype/tier precedence resolves in favor of the most recent choice

**Superseded during implementation.** The design originally assumed the existing archetype-beats-tier interaction could be carried over untouched, and listed only its new *visibility* as a risk. Building the Decks modal showed that assumption was wrong: the reconciliation lives in an effect keyed on both filters, so it fires when *either* changes — meaning that with an archetype isolated, choosing a tier is silently reverted. The Decks card would have been a prominent control that visibly does nothing in that state, contradicting this change's own "selecting a row applies the filter" requirement.

Resolved (confirmed with the user) as most-recent-choice-wins: selecting a tier now clears a contradictory archetype, mirroring the existing rule in the other direction. The pre-existing behavior is a latent bug reachable from the sidebar today, not a deliberate asymmetry, so fixing it is in scope rather than a separate change.

Mechanically this moves the *resolution* out of the effect and into the two selection handlers, which know which filter the user just chose — something an effect cannot. The effect is kept, reduced to the case it alone can cover: a `breakdown` reload reassigning tiers so that two still-valid selections start disagreeing.

### The "All" row is the per-group clear

Rather than adding a separate clear affordance inside each modal, the first row is the existing "All events / All archetypes / All tiers" default that the specs already require every filter group to expose. One row shape, one mechanism, and it keeps the modal's job to "pick one of these".

### The card stays a value and a label; the caption names the filter

**Superseded after the first preview.** The original design had each StatCard name its active filter on a third line, on the reasoning that the filtered state must be visible where the sidebar is a collapsed drawer. Rejected on review: it made the cards busy and repeated information the caption row is already responsible for.

The requirement it was serving still holds — the filtered state must be visible without opening the sidebar — but the grid caption now carries it for every filter, including the isolated-archetype view, which previously went untitled. One place names the active view instead of two.

### Reset placement and disabled-vs-hidden

The main-window control sits right-aligned on the grid caption row, opposite the caption and freshness lines, on both desktop and mobile — one position in both layouts. The alternative of giving it its own left-aligned row below the freshness line on mobile was considered and rejected: it costs a full row of vertical space where space is tightest and separates the control from the caption block it belongs to. **Pending preview** — whether it reads as balanced against a two-line caption block at narrow widths, and whether it crowds the freshness text, can only be settled on the preview.

It is always rendered and disabled when no filter is active, matching the existing `ClearFiltersButton`. **Calculated:** a control that appears and disappears would change the caption row's height and push the entire grid down on every filter toggle. The cost is a permanently visible disabled control in the default view; the stability was judged worth it. Settled on the preview: the enabled control takes the accent treatment (neon tint, accent rim, accent text) so the way out of a filtered view reads as an action, and the disabled state drops the accent entirely to a muted outline so it recedes beside the caption.

### Sidebar `Clear filters` stays

Both controls call the same handler. Keeping the sidebar one means the drawer remains self-sufficient (its filters and their clear live together) at the cost of two controls doing the same job in different places.

### No search

Ordering carries the load instead: `breakdown` is already share-descending and `events` date-descending, so the rows anyone is likely to want sit at the top. The Archetypes modal can run to ~117 rows, which is a long scroll — but it is exactly the scroll the existing archetype `<select>` already has, so this is not a regression. Search stays an easy follow-up.

### Localization and card art rules

Modal titles, "All …" rows, tier labels, and the Reset control get new i18n keys in both locales. Event and archetype names stay in English per the project's proper-noun rule. Rows show tier badges and mana pips as flat list items on the modal surface, not over card art, so the "text over art needs its own dark backdrop" rule does not come into play here.

## Risks / Trade-offs

- **Two clear controls and two entry points invite state divergence** → Both read and write the same `useState` in `App.tsx`; no derived copies, no local filter state inside the modal. A modal selection is a call to the same setter the sidebar select calls.
- **A modal selection can clear another filter** (archetype/tier precedence) → Now symmetric, so the filter the user just chose always sticks and only the *other* one clears. Still becomes visible for the first time — the user watches the other card's active-filter line disappear — so it is worth a look on the preview to judge whether it reads as a glitch.
- **Interactive StatCards change the header's tab order** → Three new tab stops before the sidebar. Each needs a visible focus indicator; **pending preview** whether the focus ring is legible against the card's `--surface-faint` background.
- **A ~117-row modal is a long scroll on mobile** → Accepted (see No search); mitigated by ordering.
- **`App.tsx` is already 545 lines and gains modal open/close state** → The modal component owns its own chrome; `App.tsx` gains only which-modal-is-open state and the row data it already computes.

## Migration Plan

Not applicable — client-side only, no data or schema changes, no migration. Rollback is reverting the PR.
