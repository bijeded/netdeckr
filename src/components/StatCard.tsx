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
  /**
   * The active filter's value, shown under the label so the filtered state is
   * visible without opening the sidebar. Null when the filter is at its
   * "All" default, in which case no extra line renders.
   */
  activeFilter?: string | null
  style?: CSSProperties
}

/**
 * Small right-aligned header summary metric (value + uppercase micro-label).
 * The value uses the mono font per Netdeckr's "all data is mono" convention.
 *
 * Given `onOpen` the card becomes the trigger for its filter modal — the same
 * box, now a button — and names its active filter beneath the label.
 */
export function StatCard({
  value,
  label,
  color = 'var(--text-primary)',
  onOpen,
  open,
  activeFilter,
  style,
}: StatCardProps) {
  const body = (
    <>
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
      {activeFilter != null && (
        <div className="stat-card-active" title={activeFilter}>
          {activeFilter}
        </div>
      )}
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
