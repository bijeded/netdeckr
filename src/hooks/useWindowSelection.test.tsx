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

  it('defaults to Last 7 Days when the URL has no window', () => {
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('7days')
  })

  it('reads a valid window from the ?w= param', () => {
    setUrl('?w=2weeks')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('2weeks')
  })

  it('falls back to the default for an invalid ?w= param', () => {
    setUrl('?w=999')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('7days')
  })

  it('falls back to the default for the retired 2months window', () => {
    setUrl('?w=2months')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('7days')
  })

  it('falls back to the default for the retired 5days window (legacy links)', () => {
    setUrl('?w=5days')
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('7days')
  })

  it('updates state and persists the selection to the URL', () => {
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('2weeks'))
    expect(result.current.window).toBe('2weeks')
    expect(new URLSearchParams(window.location.search).get('w')).toBe('2weeks')
  })

  it('keeps the window independent of the ?f= format param', () => {
    setUrl('?f=MO')
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('2weeks'))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('w')).toBe('2weeks')
    expect(params.get('f')).toBe('MO') // format param is preserved
  })

  it('normalizes an invalid value passed to setWindow', () => {
    const { result } = renderHook(() => useWindowSelection())
    act(() => result.current.setWindow('BAD' as WindowCode))
    expect(result.current.window).toBe('7days')
    expect(new URLSearchParams(window.location.search).get('w')).toBe('7days')
  })

  it('syncs the window when the URL changes via back/forward navigation', () => {
    const { result } = renderHook(() => useWindowSelection())
    expect(result.current.window).toBe('7days')
    act(() => {
      window.history.replaceState({}, '', '?w=2weeks')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.window).toBe('2weeks')
  })
})
