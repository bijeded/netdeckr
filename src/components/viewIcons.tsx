/**
 * The decklist modal's view-toggle icons.
 *
 * Drawn as inline SVG rather than character glyphs: the glyph pair this replaced
 * (▦ / ≡) read as the same grey texture at 13px, which is exactly the size the
 * control renders at — and on mobile the icon is the whole control, with no label
 * to disambiguate it. Both take their colour from `currentColor` and are marked
 * `aria-hidden`; the button carries the accessible name.
 */

const SIZE = 14

/** Four squares — switches to the card-image grid. */
export function GalleryIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="6" height="6" rx="1" />
      <rect x="8" y="0" width="6" height="6" rx="1" />
      <rect x="0" y="8" width="6" height="6" rx="1" />
      <rect x="8" y="8" width="6" height="6" rx="1" />
    </svg>
  )
}

/** Three bars — switches back to the text decklist. */
export function ListIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="0" y="1" width="14" height="2" rx="1" />
      <rect x="0" y="6" width="14" height="2" rx="1" />
      <rect x="0" y="11" width="14" height="2" rx="1" />
    </svg>
  )
}
