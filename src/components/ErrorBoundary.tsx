import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { EmptyState } from './EmptyState'

/** Localized fallback shown when the boundary catches a render error. */
function ErrorFallback() {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-4)',
        minHeight: '60vh',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-h2)',
          fontWeight: 'var(--fw-semibold)',
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--text-primary)',
        }}
      >
        {t('error.title')}
      </h1>
      <EmptyState message={t('error.message')} />
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--fw-semibold)',
          fontSize: 'var(--fs-sm)',
          padding: '9px 18px',
          borderRadius: 'var(--r-md)',
          border: '1px solid rgba(177,75,255,.6)',
          background: 'linear-gradient(140deg,rgba(177,75,255,.22),rgba(122,43,255,.16))',
          color: 'var(--neon-text-soft)',
          boxShadow: 'var(--glow-neon)',
          cursor: 'pointer',
        }}
      >
        {t('error.reload')}
      </button>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Top-level error boundary: catches render errors anywhere below it and shows a
 * localized fallback instead of a blank white screen. Class component because
 * only class lifecycles (getDerivedStateFromError / componentDidCatch) can catch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to Sentry (no-ops when no DSN is configured) and mirror to the
    // console so failures stay visible in local dev.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    })
    console.error('Uncaught error in React tree:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />
    return this.props.children
  }
}
