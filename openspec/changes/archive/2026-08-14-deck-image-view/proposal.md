## Why

The decklist modal only shows text lines. Magic players recognise decks by card art far
faster than by reading 20 names, and every major decklist site (Hareruya, MTGGoldfish,
Moxfield) offers an image view for exactly that reason. The card images are already
hotlinked per deck card for the hover preview, so the gap is presentation, not data.

## What Changes

- Add an **image view** to the decklist modal: mainboard and sideboard render as grids of
  card thumbnails instead of text lines.
- Add a **view toggle** in the modal header, before the export button: `▦` switches to
  images, `≡` switches back to the list. It carries a visible label on desktop and is
  icon-only on mobile, where the header row has no space for a third labelled control.
- The toggle **resets to list view every time a modal opens** — no persistence across
  decks or sessions.
- In image view the mainboard is a **single flat grid** with no card-type headings, ordered
  creatures → spells → other → lands. Lands last, continuing the same rows rather than
  starting their own. The list view keeps its existing card-type grouping unchanged.
- Each tile carries a **quantity indicator** (`x1`–`x4`) over the art, on its own dark
  backdrop.
- Cards with no resolved Scryfall printing render a **placeholder tile** bearing the card
  name, keeping the deck's card count honest.
- The existing hover/touch card-art preview **also works from a tile**, since thumbnails are
  too small to read rules text on any screen.
- Store a **thumbnail image URL** per deck card (Scryfall `small`, ~146px wide) alongside
  the existing normal-size URL, so a 75-card grid costs roughly a tenth of the bandwidth of
  reusing full-size art.
- Add a **one-shot backfill workflow** so rows enriched before this change gain the
  thumbnail URL without waiting for retention to cycle them out.

Not changing: the export flow, the list view's grouping and ordering, the 7days/2weeks
time-window model, and the 30-day retention window.

## Capabilities

### New Capabilities

None — this extends the existing decklist modal rather than introducing a new surface.

### Modified Capabilities

- `archetype-decklists-view`: the decklist modal gains a second rendering mode for the
  mainboard and sideboard, plus the control that switches between modes and the ordering
  rule for the flat grid. Adds requirements; the existing list-view, grouping, export, and
  dismissal requirements are unchanged.
- `card-art-display`: the card-art preview's trigger is no longer only a card name — it also
  triggers from a card tile in image view. Behaviour of the preview itself is unchanged.
- `scryfall-card-mapping`: resolved printings now also carry a thumbnail image URL, written
  for new deck cards and backfillable for existing ones.

## Impact

**Database** — `public.deck_cards` gains one nullable column (`small_image_url`); an additive
change with an `alter table ... add column if not exists`, consistent with how card-art
columns were added before. No RLS policy change: the browser's read-only select simply
returns one more column. `supabase/schema.sql` is edited, which CLAUDE.md gates behind an
explicit migration task — this is that task.

**Scraper** — `scraper/scryfall.py` (printing extraction) and `scraper/supabase_writer.py`
(deck-card writes and the backfill paths) both gain the new field. The completeness sentinel
that drives the existing backfill (`image_url is null`) is deliberately untouched, so the new
column needs its own one-shot pass rather than riding along on the current one. Scraper tests
and their saved fixtures are affected.

**Frontend** — `DecklistModal` (new mode, header control), `CardArtPreview` (trigger becomes
arbitrary content rather than a name string, affecting its existing tests), `useDeckCards`
(one more selected column and line field), `dashboard.css` (grid tracks at the existing
640px breakpoint), and the ES/EN locale files. `cardType.ts`'s grouping is reused as-is for
the flat ordering.

**Pipeline** — one new `workflow_dispatch` GitHub Actions entry point for the backfill. The
twice-daily cron schedule, its per-format staggering, and the pruning step are untouched.

**Blast radius** — the decklist modal is the only user-visible surface affected, and it stays
in list view by default, so the change is invisible until a user opens the new control.
Everything outside the modal (dashboard, archetype grid, trending tables, export) is
unaffected. The riskiest area is the schema plus scraper write path, where a mistake would
show up as missing thumbnails rather than as data loss, since the column is additive and
nullable.
