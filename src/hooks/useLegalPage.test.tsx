import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLegalPage } from './useLegalPage'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

describe('useLegalPage', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => setUrl('/'))

  it('defaults to null when the URL has no page param', () => {
    const { result } = renderHook(() => useLegalPage())
    expect(result.current.page).toBeNull()
  })

  it('reads a valid page from the ?page= param', () => {
    setUrl('?page=privacy')
    const { result } = renderHook(() => useLegalPage())
    expect(result.current.page).toBe('privacy')
  })

  it('falls back to null for an invalid ?page= param', () => {
    setUrl('?page=nope')
    const { result } = renderHook(() => useLegalPage())
    expect(result.current.page).toBeNull()
  })

  it('updates state and persists the selection to the URL', () => {
    const { result } = renderHook(() => useLegalPage())
    act(() => result.current.setPage('how-it-works'))
    expect(result.current.page).toBe('how-it-works')
    expect(new URLSearchParams(window.location.search).get('page')).toBe('how-it-works')
  })

  it('clearing the page removes the param', () => {
    setUrl('?page=privacy')
    const { result } = renderHook(() => useLegalPage())
    act(() => result.current.setPage(null))
    expect(result.current.page).toBeNull()
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
  })

  it('preserves other params when setting the page', () => {
    setUrl('?f=MO&w=2weeks')
    const { result } = renderHook(() => useLegalPage())
    act(() => result.current.setPage('privacy'))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('f')).toBe('MO')
    expect(params.get('w')).toBe('2weeks')
    expect(params.get('page')).toBe('privacy')
  })

  it('syncs the page when the URL changes via back/forward navigation', () => {
    const { result } = renderHook(() => useLegalPage())
    expect(result.current.page).toBeNull()
    act(() => {
      window.history.pushState({}, '', '?page=how-it-works')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.page).toBe('how-it-works')
  })
})
