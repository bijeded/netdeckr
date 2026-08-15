## 1. Schema

- [x] 1.1 Add the nullable `small_image_url` column to `deck_cards` in `supabase/schema.sql` — both in the create-table definition (fresh apply) and as an `alter table ... add column if not exists` alongside the existing card-art column additions — and apply it to the live database. No RLS change. **Live-database apply is still outstanding — it needs Supabase credentials not available to the agent and must be run by hand before the pipeline writes thumbnails.**

## 2. Scraper (Python)

- [x] 2.1 Extract the printing's thumbnail image URL in `scryfall.py`, mirroring how the normal-size URL is resolved including the split/DFC front-face fallback, and carry it on the printing record.
- [x] 2.2 Write `small_image_url` in `supabase_writer.py` on the deck-card insert path and in the remap pass, leaving the existing `image_url is null` completeness sentinel untouched.
- [x] 2.3 Add the thumbnail backfill pass keyed on its own `small_image_url is null` sentinel, paged and idempotent like the existing backfill, resolving only rows whose names map and leaving misses null.
- [x] 2.4 Cover 2.1–2.3 with pytest against the saved fixtures — thumbnail extracted for a normal card and a split/DFC card, null on a resolution miss, backfill idempotent and scoped to its own sentinel. Run `cd scraper && pytest`.

## 3. Pipeline

- [x] 3.1 Add a `workflow_dispatch` entry point that runs the thumbnail backfill, leaving the twice-daily per-format crons and the pruning step unchanged.

## 4. Frontend data

- [x] 4.1 Select `small_image_url` in `useDeckCards` and expose it on `DeckCardLine` as the thumbnail, falling back to the normal image when the thumbnail is absent.

## 5. Card-art preview refactor

- [x] 5.1 Change `CardArtPreview` to wrap arbitrary children as its trigger instead of rendering the card name itself, keeping `name` for alt text and the no-image no-op, and leaving the pointer/touch, portal, and viewport-clamping behaviour unchanged. Update `CardArtPreview.test.tsx` and the list-view call site.

## 6. Image view

- [x] 6.1 Build the card tile: thumbnail image, lazy-loaded, with the quantity indicator on its own opaque backdrop, and the placeholder treatment for a missing image or a failed load. Wrap it in `CardArtPreview`.
- [x] 6.2 Render both boards as tile grids in `DecklistModal` — mainboard flattened from `groupMainByType` in creatures → spells → other → lands order into a single grid with no group wrappers, sideboard as one grid, section headings and counts unchanged from list view.
- [x] 6.3 Add the image-view grid CSS to `dashboard.css`: `1.45fr / 1fr` board split with fixed 72px tile tracks on desktop, flexible `minmax(72px, 1fr)` tracks below the existing 640px breakpoint. No new media query.

## 7. View toggle

- [x] 7.1 Add the list/image toggle to the modal header before the export action — `▦` / `≡` indicating the target view, label hidden below 640px, `aria-label` in both locales, state local to the modal so it resets on every open.
- [x] 7.2 Add the ES/EN strings for both toggle states and their accessible names.

## 8. Verify

- [x] 8.1 Cover the new modal behaviour with Vitest — image view renders one tile per distinct card with its quantity, lands come last in a flat grid with no headings, placeholder tile for a card with no image, toggle switches views and resets on reopen, export output identical in both views. Assert behaviour rather than exact style values. Run `npm run test`.
- [x] 8.2 Run `npm run lint` and `npm run type-check`.
- [x] 8.3 Open a PR and confirm on the Vercel preview: the 6/4 desktop column count, the mobile tile track question left open in design.md (full-width vs capped), quantity-indicator legibility at tile size, and the header layout in both locales. Record the settled values in design.md.
