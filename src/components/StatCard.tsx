import type { CSSProperties } from 'react'

interface StatCardProps {
  /** Preformatted metric value (e.g. "1,284"). */
  value: string
  /** Uppercase micro-label describing the metric. */
  label: string
  /** Value color; defaults to the primary text token. */
  color?: string
  style?: CSSProperties
}

/**
 * Small right-aligned header summary metric (value + uppercase micro-label),
 * ported from the design system's StatCard. The value uses the mono font per
 * Netdeckr's "all data is mono" convention.
 */
export function StatCard({ value, label, color = 'var(--text-primary)', style }: StatCardProps) {
  return (
    <div className="stat-card" style={style}>
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
