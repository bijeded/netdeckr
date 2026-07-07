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
 * MetaStack's "all data is mono" convention.
 */
export function StatCard({ value, label, color = 'var(--text-primary)', style }: StatCardProps) {
  return (
    <div
      style={{
        padding: '10px 16px',
        border: '1px solid var(--border-soft)',
        background: 'var(--surface-faint)',
        borderRadius: 'var(--r-lg)',
        minWidth: 96,
        textAlign: 'right',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-stat-sm)',
          fontWeight: 'var(--fw-bold)',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--fs-3xs)',
          color: 'var(--text-muted)',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  )
}
