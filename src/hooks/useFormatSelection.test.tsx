import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useFormatSelection } from './useFormatSelection'
import type { FormatCode } from '../lib/formats'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

describe('useFormatSelection', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => setUrl('/'))

  it('defaults to Standard when the URL has no format', () => {
    const { result } = renderHook(() => useFormatSelection())
    expect(result.current.format).toBe('ST')
  })

  it('reads a valid format from the ?f= param', () => {
    setUrl('?f=MO')
    const { result } = renderHook(() => useFormatSelection())
    expect(result.current.format).toBe('MO')
  })

  it('falls back to the default for an invalid ?f= param', () => {
    setUrl('?f=NOPE')
    const { result } = renderHook(() => useFormatSelection())
    expect(result.current.format).toBe('ST')
  })

  it('updates state and persists the selection to the URL', () => {
    const { result } = renderHook(() => useFormatSelection())
    act(() => result.current.setFormat('PAU'))
    expect(result.current.format).toBe('PAU')
    expect(new URLSearchParams(window.location.search).get('f')).toBe('PAU')
  })

  it('normalizes an invalid value passed to setFormat', () => {
    const { result } = renderHook(() => useFormatSelection())
    act(() => result.current.setFormat('BAD' as FormatCode))
    expect(result.current.format).toBe('ST')
    expect(new URLSearchParams(window.location.search).get('f')).toBe('ST')
  })

  it('syncs the format when the URL changes via back/forward navigation', () => {
    const { result } = renderHook(() => useFormatSelection())
    expect(result.current.format).toBe('ST')
    act(() => {
      window.history.replaceState({}, '', '?f=MO')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.format).toBe('MO')
  })
})
