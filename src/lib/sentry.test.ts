import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted with the mock, which vi.mock lifts above every other statement.
const { captureException, sdkMock } = vi.hoisted(() => {
  const captureException = vi.fn()
  return {
    captureException,
    sdkMock: () => ({ captureException: (...args: unknown[]) => captureException(...args) }),
  }
})
vi.mock('@sentry/react', sdkMock)

import { captureError, toError } from './sentry'

describe('toError', () => {
  it('passes an Error through unchanged', () => {
    const err = new Error('boom')
    expect(toError(err)).toBe(err)
  })

  it('wraps a Supabase error object with its code leading the message', () => {
    const wrapped = toError({ code: '57014', message: 'canceling statement due to statement timeout' })
    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toBe('57014: canceling statement due to statement timeout')
  })

  it('wraps a code-less object and a primitive', () => {
    expect(toError({ message: 'nope' }).message).toBe('nope')
    expect(toError('plain').message).toBe('plain')
  })
})

describe('captureError', () => {
  beforeEach(() => {
    captureException.mockReset()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.example/1')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('reports an Error with the given context', async () => {
    const err = new Error('boom')
    captureError(err, { tags: { rpc: 'top_cards' } })
    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(1))
    expect(captureException).toHaveBeenCalledWith(err, { tags: { rpc: 'top_cards' }, extra: undefined })
  })

  it('wraps a Supabase error and keeps the original under extra.raw', async () => {
    const raw = { code: '57014', message: 'canceling statement due to statement timeout' }
    captureError(raw, { tags: { format: 'MO' }, extra: { window: '2weeks' } })
    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(1))
    const [reported, ctx] = captureException.mock.calls[0]
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).message).toBe('57014: canceling statement due to statement timeout')
    expect(ctx).toEqual({ tags: { format: 'MO' }, extra: { window: '2weeks', raw } })
  })

  it('does nothing when no DSN is configured', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    captureError(new Error('silent'))
    await new Promise((r) => setTimeout(r, 0))
    expect(captureException).not.toHaveBeenCalled()
  })

  it('swallows a failed SDK import', async () => {
    vi.resetModules()
    vi.doMock('@sentry/react', () => {
      throw new Error('chunk load failed')
    })
    const { captureError: fresh } = await import('./sentry')
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      expect(() => fresh(new Error('boom'))).not.toThrow()
      await new Promise((r) => setTimeout(r, 10))
      expect(unhandled).not.toHaveBeenCalled()
      expect(captureException).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
      vi.doMock('@sentry/react', sdkMock)
      vi.resetModules()
    }
  })
})
