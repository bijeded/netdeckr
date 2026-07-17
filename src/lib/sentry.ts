/**
 * Initialize Sentry error tracking. Errors-only: no performance tracing or
 * session replay (keeps the free-tier quota for real crashes and the bundle
 * light).
 *
 * The SDK is loaded via a dynamic import so `@sentry/react` is emitted as a
 * separate async chunk instead of sitting in the critical initial bundle, and
 * init is deferred to idle time so it never competes with first paint. Trade-off:
 * errors in the first moments before the chunk loads aren't captured — acceptable
 * for a client-only dashboard. No-ops when no DSN is configured, so local dev and
 * CI stay silent unless VITE_SENTRY_DSN is set.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  const start = () => {
    void import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          // Vercel injects the target env; fall back to Vite's mode locally.
          environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
          // Tag events with the deployed commit so we can pinpoint a bad release.
          release: import.meta.env.VITE_SENTRY_RELEASE,
          // Errors only — no tracing/replay for v1.
          tracesSampleRate: 0,
        })
      })
      .catch(() => {
        // Swallow: a failed Sentry load must never break the app.
      })
  }

  if (typeof requestIdleCallback === 'function') requestIdleCallback(start)
  else setTimeout(start, 0)
}
