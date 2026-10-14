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
          // Safari rejects the Speed Insights beacon's CustomEvent on unload with
          // no serializable info (no stack, no message) — noise, not an app bug.
          ignoreErrors: ['Object captured as promise rejection with keys: [object has no keys]'],
        })
      })
      .catch(() => {
        // Swallow: a failed Sentry load must never break the app.
      })
  }

  if (typeof requestIdleCallback === 'function') requestIdleCallback(start)
  else setTimeout(start, 0)
}

/** Searchable tags, debug-only extras, and structured contexts for one report. */
export interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  contexts?: Record<string, Record<string, unknown>>
}

/**
 * Normalize a thrown value to an `Error`. Supabase rejects with plain objects
 * (`{ code, message, details, hint }`), which Sentry would serialize without a
 * readable title or useful grouping, so they are wrapped with the code leading
 * the message (e.g. "57014: canceling statement due to statement timeout").
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const { code, message } = value as { code?: unknown; message?: unknown }
    const text = String(message)
    return new Error(typeof code === 'string' && code ? `${code}: ${text}` : text)
  }
  return new Error(String(value))
}

/**
 * Report a caught error to Sentry. The SDK is imported dynamically (the same
 * async chunk `initSentry` loads) and a failed import is swallowed: reporting
 * must never break the caller. No-ops when no DSN is configured, so local dev
 * and CI stay silent. A non-`Error` value is wrapped by `toError` and the
 * original is kept under `extra.raw`.
 */
export function captureError(error: unknown, context: ErrorContext = {}): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  const extra = error instanceof Error ? context.extra : { ...context.extra, raw: error }
  void import('@sentry/react')
    .then((Sentry) => {
      Sentry.captureException(toError(error), { ...context, extra })
    })
    .catch(() => {})
}
