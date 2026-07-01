interface SpinnerProps {
  /** Accessible label (localized by the caller). */
  label: string
  size?: number
}

/** A neon ring spinner shown while the breakdown loads. */
export function Spinner({ label, size = 34 }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid var(--neon-tint-16)',
        borderTopColor: 'var(--neon-500)',
        boxShadow: 'var(--glow-neon)',
        animation: 'mtg-spin 0.8s linear infinite',
      }}
    />
  )
}
