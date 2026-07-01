interface EmptyStateProps {
  /** Message text (localized by the caller). */
  message: string
}

/** Centered friendly empty/error state with a frowny face. */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-4)',
        padding: 'var(--sp-8)',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <span
        data-testid="frowny"
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 46,
          color: 'var(--text-faint)',
          lineHeight: 1,
        }}
      >
        :(
      </span>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)', margin: 0 }}>
        {message}
      </p>
    </div>
  )
}
