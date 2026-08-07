import type { CSSProperties } from 'react'

interface StatCardProps {
  /** Preformatted metric value (e.g. "1,284"). */
  value: string
  /** Uppercase micro-label describing the metric. */
  label: string
  /** Value color; defaults to the primary text token. */
  color?: string
  /**
   * Opens this card's filter modal. When given, the card renders as a button;
   * without it the card stays the plain readout it has always been.
   */
  onOpen?: () => void
  /** True while this card's modal is open (drives aria-expanded). */
  open?: boolean
  style?: CSSProperties
}

/**
 * Small right-aligned header summary metric (value + uppercase micro-label).
 * The value uses the mono font per Netdeckr's "all data is mono" convention.
 *
 * Given `onOpen` the card becomes the trigger for its filter modal — the same
 * box, now a button. The card stays a value and a label either way: the active
 * filter is named by the grid caption, not repeated here.
 */
export function StatCard({ value, label, color = 'var(--text-primary)', onOpen, open, style }: StatCardProps) {
  const body = (
    <>
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
    </>
  )

  if (!onOpen) {
    return (
      <div className="stat-card" style={style}>
        {body}
      </div>
    )
  }
  return (
    <button
      type="button"
      className="stat-card stat-card--button"
      style={style}
      aria-haspopup="dialog"
      aria-expanded={open ?? false}
      onClick={onOpen}
    >
      {body}
    </button>
  )
}
