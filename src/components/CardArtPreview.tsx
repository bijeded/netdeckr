import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

interface CardArtPreviewProps {
  name: string
  imageUrl?: string | null
}

// Normal-size Scryfall art is ~488×680 (ratio ~0.717); render it compact.
const PREVIEW_W = 240
const PREVIEW_H = 335
const GAP = 16 // offset from the pointer so the cursor never covers the art

/** Clamp the preview to the viewport, placing it to the left/above the pointer
 *  when it would overflow the right/bottom edge. */
function clamp(x: number, y: number): { left: number; top: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = x + GAP + PREVIEW_W > w ? Math.max(GAP, x - GAP - PREVIEW_W) : x + GAP
  const top = Math.min(Math.max(GAP, y - PREVIEW_H / 2), Math.max(GAP, h - PREVIEW_H - GAP))
  return { left, top }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * A card name that reveals its full Scryfall art on hover (mouse) or touch
 * (mobile). The art is lazy-loaded (fetched only when shown), hotlinked from
 * Scryfall's CDN, rendered in a portal so it never shifts the decklist, and
 * clamped to the viewport. A null `imageUrl` (unresolved card) is a plain label.
 */
export function CardArtPreview({ name, imageUrl }: CardArtPreviewProps) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const viaTouch = useRef(false)
  const anchorRef = useRef<HTMLSpanElement>(null)

  const active = pos !== null && !failed
  const hide = () => setPos(null)

  // Touch: dismiss on the next tap anywhere outside the card name. The tap that
  // *opened* the preview is skipped: on real touch devices React flushes this
  // passive effect (registering the listener) before the opening pointerdown has
  // finished bubbling to `document`, so without this guard that same tap would
  // reach the listener and immediately hide the preview. Ignoring pointerdowns
  // whose target is the anchor keeps the opening (and a re-tap) from dismissing,
  // while a genuine outside tap still hides it.
  useEffect(() => {
    if (!active || !viaTouch.current) return
    const onDocDown = (e: PointerEvent) => {
      const anchor = anchorRef.current
      if (anchor && e.target instanceof Node && anchor.contains(e.target)) return
      hide()
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [active])

  if (!imageUrl) {
    return <span>{name}</span>
  }

  const show = (e: ReactPointerEvent) => {
    if (failed) return
    setPos(clamp(e.clientX, e.clientY))
  }

  const onPointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') return
    viaTouch.current = false
    show(e)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || pos === null) return
    setPos(clamp(e.clientX, e.clientY))
  }
  const onPointerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') return
    hide()
  }
  const onPointerDown = (e: ReactPointerEvent) => {
    // A mouse press uses the hover path, not this one; touch/pen taps show here.
    if (e.pointerType === 'mouse') return
    viaTouch.current = true
    show(e)
  }

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    left: pos?.left,
    top: pos?.top,
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: 'var(--radius-deck, 11px)',
    boxShadow: '0 12px 40px rgba(0,0,0,.6)',
    border: '1px solid var(--neon-border, rgba(177,75,255,.4))',
    pointerEvents: 'none',
    zIndex: 1000,
    transition: prefersReducedMotion() ? 'none' : 'opacity 120ms ease-out',
    background: 'var(--surface-card, #11121b)',
  }

  return (
    <>
      <span
        ref={anchorRef}
        style={{ cursor: 'help' }}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
      >
        {name}
      </span>
      {active &&
        createPortal(
          <img
            src={imageUrl}
            alt={name}
            style={{ ...overlayStyle, objectFit: 'cover', display: 'block' }}
            onError={() => {
              setFailed(true)
              hide()
            }}
          />,
          document.body,
        )}
    </>
  )
}
