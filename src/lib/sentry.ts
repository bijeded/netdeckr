import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry error tracking. Errors-only: no performance tracing or
 * session replay (keeps the free-tier quota for real crashes and the bundle
 * light). Safe to call unconditionally — it no-ops when no DSN is configured,
 * so local dev and CI stay silent unless you opt in.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    // Vercel injects the target env; fall back to Vite's mode locally.
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    // Tag events with the deployed commit so we can pinpoint a bad release.
    release: import.meta.env.VITE_SENTRY_RELEASE,
    // Errors only — no tracing/replay for v1.
    tracesSampleRate: 0,
  })
}
