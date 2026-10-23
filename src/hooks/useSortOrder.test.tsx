import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSortOrder } from './useSortOrder'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

describe('useSortOrder', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => setUrl('/'))

  it('defaults to Popular when the URL has no sort param', () => {
    const { result } = renderHook(() => useSortOrder())
    expect(result.current.sortOrder).toBe('popular')
  })

  it('restores Power from ?sort=power', () => {
    setUrl('?sort=power')
    const { result } = renderHook(() => useSortOrder())
    expect(result.current.sortOrder).toBe('power')
  })

  it('removes an unknown sort value and applies Popular', () => {
    setUrl('?f=MO&sort=score')
    const { result } = renderHook(() => useSortOrder())
    expect(result.current.sortOrder).toBe('popular')
    expect(window.location.search).toBe('?f=MO')
  })

  it('removes an explicit ?sort=popular, since Popular is the absence of the param', () => {
    setUrl('?sort=popular')
    renderHook(() => useSortOrder())
    expect(new URLSearchParams(window.location.search).has('sort')).toBe(false)
  })

  it('writes sort=power and deletes the param when switching back to Popular', () => {
    const { result } = renderHook(() => useSortOrder())
    act(() => result.current.setSortOrder('power'))
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('power')
    act(() => result.current.setSortOrder('popular'))
    expect(new URLSearchParams(window.location.search).has('sort')).toBe(false)
    expect(result.current.sortOrder).toBe('popular')
  })

  it('adds no history entry when the order changes', () => {
    const { result } = renderHook(() => useSortOrder())
    const before = window.history.length
    act(() => result.current.setSortOrder('power'))
    act(() => result.current.setSortOrder('popular'))
    expect(window.history.length).toBe(before)
  })

  it('preserves the other params', () => {
    setUrl('?f=MO&w=2weeks&a=Izzet+Control&tab=analysis')
    const { result } = renderHook(() => useSortOrder())
    act(() => result.current.setSortOrder('power'))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('f')).toBe('MO')
    expect(params.get('w')).toBe('2weeks')
    expect(params.get('a')).toBe('Izzet Control')
    expect(params.get('tab')).toBe('analysis')
    expect(params.get('sort')).toBe('power')
  })

  it('keeps the history entry state it replaces', () => {
    window.history.replaceState({ archetypeEntry: true }, '', '/')
    const { result } = renderHook(() => useSortOrder())
    act(() => result.current.setSortOrder('power'))
    expect(window.history.state).toEqual({ archetypeEntry: true })
  })

  it('follows browser back/forward navigation', () => {
    const { result } = renderHook(() => useSortOrder())
    act(() => {
      window.history.replaceState({}, '', '?sort=power')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.sortOrder).toBe('power')
  })
})
