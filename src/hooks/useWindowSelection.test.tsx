import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWindowSelection } from './useWindowSelection'
import type { WindowCode } from '../lib/windows'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

describe('useWindowSelection', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => setUrl('/'))

  it('defaults to Last 2 Weeks when the URL has no window', () => {
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('50')
  })

  it('reads a valid window from the ?w= param', () => {
    setUrl('?w=52')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('52')
  })

  it('falls back to the default for an invalid ?w= param', () => {
    setUrl('?w=999')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('50')
  })

  it('updates state and persists the selection to the URL', () => {
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('285'))
    expect(result.current.window).toBe('285')
    expect(new URLSearchParams(window.location.search).get('w')).toBe('285')
  })

  it('keeps the window independent of the ?f= format param', () => {
    setUrl('?f=MO')
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('326'))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('w')).toBe('326')
    expect(params.get('f')).toBe('MO') // format param is preserved
  })

  it('normalizes an invalid value passed to setWindow', () => {
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('BAD' as WindowCode))
    expect(result.current.window).toBe('50')
    expect(new URLSearchParams(window.location.search).get('w')).toBe('50')
  })

  it('syncs the window when the URL changes via back/forward navigation', () => {
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('50')
    act(() => {
      window.history.replaceState({}, '', '?w=52')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.window).toBe('52')
  })
})
