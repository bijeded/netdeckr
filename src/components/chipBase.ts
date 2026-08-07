import type { CSSProperties } from 'react'

/**
 * Shared treatment for the chips overlaid on an archetype card's signature art
 * (the tier badge and the trend arrow).
 *
 * The art is arbitrary — any hue, any brightness — so a translucent hue tint
 * makes the *art* the background the label is read against, and contrast becomes
 * unknowable. `backdrop-filter: blur()` does not help on its own: it
 * redistributes the art's luminance without lowering it, so blurred bright art
 * is still bright. The fix is an actual dark layer.
 *
 * At 82% the worst case — pure-white art — composites to ~#35363b, which every
 * tier and trend color clears 4.5:1 against (ratios in design/tokens/colors.css).
 * The remaining 18% plus the blur is what keeps the chip reading as glass rather
 * than as an opaque block: the art stays visible behind it as texture.
 *
 * Below ~75% the T1 violet starts failing that floor over white art, so treat
 * the alpha as a lower-bounded knob, not a free one.
 */
export const CHIP_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-mono)',
  lineHeight: 1,
  borderRadius: 'var(--r-sm)',
  background: 'rgba(9,10,16,.82)',
  // saturate() keeps the art's color showing through as a tint rather than
  // going muddy grey once it is dimmed this far.
  backdropFilter: 'blur(8px) saturate(115%)',
  WebkitBackdropFilter: 'blur(8px) saturate(115%)',
}

/** Top-edge highlight that makes the chip read as a lit surface, not a hole. */
export const CHIP_INSET_HIGHLIGHT = 'inset 0 1px 0 rgba(255,255,255,.06)'
