## Context

See proposal.md — Why. Requirements are in this change's `specs/`.

The constraints that shape the approach:

- `deck_cards.image_url` holds Scryfall's **normal** image (~488×680, ~100 KB). A 75-card
  deck is roughly 18–22 distinct mainboard cards plus 5–8 sideboard cards, so reusing normal
  art for every tile is on the order of 3 MB per modal open. Scryfall publishes a **small**
  size (146×204, ~10 KB) with no intermediate step between the two.
- `DecklistModal` is `maxWidth: 880`, with `.decklist-grid` splitting it `1.55fr / 1fr`
  (mainboard / sideboard) and collapsing to one column at `max-width: 640px`. Both boards
  use `20px 22px` padding.
- `.modal-header-actions` already holds the export button and the close button, and on mobile
  becomes its own right-aligned row above the title.
- `supabase_writer.py` uses `image_url is null` as its completeness sentinel for
  `backfill_scryfall`, with an explicit code comment that `image_url` is never set
  independently of the other enrichment columns.
- `CardArtPreview` currently renders the card **name** as its own trigger element and takes
  `name` + `imageUrl` props.
- CLAUDE.md: no emoji beyond 🏆; iconography is drawn from a small glyph set. Text over card
  art needs its own dark backdrop clearing 4.5:1.

## Goals / Non-Goals

**Goals:**

- One tile size shared by both boards, derived from the existing modal width rather than a new
  modal width.
- Thumbnail bytes proportional to display size, so image view is cheap enough to be the
  default-adjacent experience rather than a heavy opt-in.
- Reuse the existing card-type classification instead of introducing a second one.
- Additive schema and write-path changes: a failure mode of "no thumbnail" rather than
  "wrong or lost data".

**Non-Goals:**

- Changing the modal's width, the `1.55fr / 1fr` intent, or the 640px breakpoint.
- Changing how the list view groups or orders cards.
- Serving or re-hosting card images ourselves — everything stays hotlinked per Scryfall's
  guidelines.
- Any caching layer for thumbnails beyond the browser's own.

## Decisions

### Store the thumbnail URL rather than deriving it

`small_image_url` becomes a column on `deck_cards`, populated from the same resolved printing
as `image_url`.

**Alternative considered and rejected: derive the small URL client-side** by rewriting
`/normal/` to `/small/` in the stored URL. Scryfall's CDN paths are size-segmented, so this
works today and costs nothing to ship. It was rejected because it hard-codes an undocumented
URL contract into the frontend: if Scryfall changes its path layout, every tile breaks at
once with no server-side fix short of a deploy. Storing the URL Scryfall itself gave us keeps
the coupling in the scraper, where a bulk-data change is already something we track.

**Alternative considered and rejected: reuse `image_url` scaled down by CSS.** Simplest
possible change, no schema work — but ~3 MB per modal open, most of it discarded by the
downscale, on a view whose whole point is browsing quickly on a phone.

### Backfill on its own sentinel, triggered manually

Existing rows carry a non-null `image_url`, so the current `image_url is null` backfill will
never revisit them. Rather than widen or re-key that sentinel — the writer explicitly
documents `image_url` as the completeness marker, and other passes depend on it — the new
column gets a separate pass keyed on `small_image_url is null`, exposed as a
`workflow_dispatch` entry point.

**Superseded decision:** the first plan was to add no backfill at all and let the 30-day
retention window cycle every row out naturally, since new inserts would carry the column.
That was overturned during exploration: it means up to 30 days of decks rendering
placeholder-heavy grids for no reason other than patience, when a one-shot action does the
same job in minutes. The retention reasoning still holds as a safety net — even if the
backfill is never run, coverage completes within 30 days.

The frontend selects `small_image_url ?? image_url`, so a row missing the thumbnail renders a
correct but heavier tile instead of a placeholder. This keeps the frontend independent of
backfill timing.

### Tile size derived from the shared-width constraint — *calculated, confirmed on the preview at 5/3*

Requiring one tile width `W` across both boards, with 8px gaps and the existing 22px padding:

```
main col  = 6W + 5(8) + 2(22) = 6W + 84
side col  = 4W + 3(8) + 2(22) = 4W + 68
                     total    = 10W + 152 = 880   →   W = 72.8  →  72px
                    yielding    main 516 · side 356 · 8px spare
```

So image view uses `grid-template-columns: 1.45fr 1fr` (from 516:356) instead of the list
view's `1.55fr / 1fr`, and each board's tile grid is `repeat(auto-fill, 72px)`. The track is
**fixed**, not `1fr`: fractional tracks let each column size its tiles independently, which is
exactly the equal-size property we need to preserve. At 72px CSS the tiles are 144 device px
on a 2× display against Scryfall small's 146px — effectively 1:1.

**Superseded on the preview:** 6/4 shipped first and was legible, but the thumbnails read as
small against the modal's width. Settled at **5 mainboard / 3 sideboard columns** at
`1.6fr / 1fr`.

The first attempt at 5/3 solved for a *snug* fit — `8W + 136 = 880` → W = 93px — and shipped
broken: it fit the mainboard by half a pixel and missed the sideboard by half a pixel, so
`auto-fill` dropped a column on each and 4/2 rendered. Two costs the original arithmetic
ignored: the modal's own 1px border and the 1px divider between the boards. Re-derived against
the real available width:

```
available     = 880 − 2 (modal border) − 1 (divider)            = 877
main content  = 877 × 1.6/2.6 − 44 padding − 1 border           ≈ 495
side content  = 877 × 1.0/2.6 − 44 padding                      ≈ 293
W = 88  →  main needs 5×88 + 4×8 = 472  (23 spare)
           side needs 3×88 + 2×8 = 280  (13 spare)
```

**W = 88px**, chosen for slack rather than for the largest tile that fits. The lesson is
recorded in the CSS: `auto-fill` degrades a column at a time, silently, so a layout solved to
the last pixel does not survive contact with a border.

At 88px the tiles are 176 device px against a 146px source, so they are upscaled ~1.2× on a
2× display — bigger but slightly softer. Scryfall publishes nothing between `small` (146) and
`normal` (488), so crisper would mean ~10× the bytes.

**Superseded decision:** the earlier plan was to stack the two boards vertically in image
view, on the reasoning that a 6-card sideboard in the narrow column would look lopsided
beside a 20-tile mainboard. The user's reference mockup overturned this — side-by-side reads
fine, and stacking would have thrown away the modal's horizontal space on desktop.

### Mobile uses a flexible track — *settled on the preview*

Below 640px the boards stack, so both are already the same width and the equal-size guarantee
holds without a fixed track. A fixed 72px track there would leave ~40px of dead gutter on a
375px-wide phone (content ≈ 291px fits 3 tiles + 40px slack), so mobile uses
`repeat(auto-fill, minmax(72px, 1fr))` — 3 across at ~88px, edge to edge.

**Settled on the preview:** neither the full-width `minmax(72px, 1fr)` nor a cap — and not
`auto-fill` at all. **Explicit counts: 4 columns at ≤460px, 5 above it**, both boards.

A `minmax(62px, 1fr)` auto-fill track was tried and produced boards that disagreed with each
other: the mainboard rendered 3 columns while the sideboard rendered 4, from the same rule.
The cause is that the mainboard div carries a 1px right border the sideboard does not, which
was enough to put the two containers on opposite sides of an auto-fill threshold. The
equal-size guarantee assumed identical container widths, and "identical" quietly wasn't.

An explicit column count removes the failure mode rather than re-tuning around it — two
boards cannot drift apart when both are told the same number. Softness at ~67px is accepted in
exchange for seeing more of the deck at once; the tiles are a browsing aid, and the full-size
preview is one tap away.

Both regimes reuse the existing 640px breakpoint; no new media query is introduced.

### Flat ordering reuses `groupMainByType`

Image view calls the same `groupMainByType` the list view uses and concatenates the groups in
a second order — creatures, spells, other, lands — into one array feeding one grid. No new
classification logic, and the specs' "lands continue the row" property is structural: it
holds because there are no per-group wrapper elements to break the flow, not because of any
rule enforcing it.

A side effect worth noting: unresolved cards land in `other` (existing behaviour), so
placeholder tiles cluster together just before the lands rather than scattering through the
grid.

### `CardArtPreview` takes children

The preview's trigger becomes `children` rather than an implicit name string, so it can wrap
either a name span (list view) or a tile (image view). `name` stays for the `alt` text and
the no-image fallback. This is a signature change to a component with an existing test file;
its pointer/touch logic, portal, and viewport clamping are untouched.

### View toggle

A `useState` in `DecklistModal`, initialised to list view — the component unmounts on close,
so "resets on every open" needs no explicit reset logic. The label is hidden below 640px via
the same breakpoint, with an `aria-label` carrying the action in both locales either way.

**Superseded on the preview:** the icons shipped as `▦` / `≡` from the existing glyph
vocabulary. At the 13px they render at, both read as the same grey texture — and on mobile the
icon *is* the whole control, with no label to disambiguate. Replaced by an inline SVG pair
(`viewIcons.tsx`): four squares for the gallery, three bars for the list. This is a new
precedent — the repo had no inline SVG in components — so CLAUDE.md's iconography rule was
widened to allow SVG where a glyph cannot carry the meaning alone.

### Quantity indicator

A mono-font pill in the tile's lower-left on an opaque dark backdrop, mirroring the reference.
Its exact size, padding, and opacity are **deferred to the preview** — at 72px the tile is
small enough that legible-but-not-dominating is a judgement call, and the 4.5:1 contrast
requirement is satisfied by construction (mono text on an opaque token background, not on
art).

## Risks / Trade-offs

- **Scryfall bandwidth from grid views** → Tiles are `loading="lazy"` and only mount in image
  view, so list-view opens fetch nothing. At ~10 KB per thumbnail a full deck grid is ~250 KB,
  comparable to a single existing hover preview.
- **`auto-fill` fails silently, a column at a time** → This bit twice: once on the desktop
  split solved to the half-pixel, once on mobile where a 1px border desynchronised the two
  boards. Mitigated by keeping ≥13px of slack in the desktop track and by stating mobile
  counts explicitly. Any future change to the modal's width, padding, or borders should be
  re-checked against the arithmetic in `dashboard.css`, not eyeballed.
- **`small_image_url` missing on un-backfilled rows** → Falls back to `image_url`; heavier,
  still correct. Only a row with neither shows a placeholder.
- **Adding a column to `deck_cards` touches a file CLAUDE.md gates** → The change is additive
  and nullable (`add column if not exists`), matching how `type_line`, `rarity`, and the
  earlier art columns were introduced.
- **`CardArtPreview`'s signature change breaks its tests** → Contained: the tests are updated
  as part of the same task, and the behaviour they assert is unchanged.
- **Header crowding on small phones** → The mobile reference shows Export + ✕ nearly filling
  the row, which is why the toggle is icon-only there. ES labels are longer than EN; the
  wide-viewport layout should be checked in both locales on the preview.

## Migration Plan

1. Apply the additive column to Supabase (`alter table ... add column if not exists`) — safe
   on a live database, no lock of consequence, no RLS change.
2. Ship the scraper write-path change; new decks carry thumbnails from the next pipeline run.
3. Run the backfill via `workflow_dispatch` once to populate existing rows.
4. Ship the frontend behind no flag — the modal opens in list view, so the change is inert
   until a user activates the toggle.

**Rollback:** revert the frontend; the column and the scraper field can stay (unused,
nullable) rather than being dropped.

## Open Questions

None outstanding — the mobile tile track, the desktop column count, and the toggle icons were
all settled on the preview and recorded above.
