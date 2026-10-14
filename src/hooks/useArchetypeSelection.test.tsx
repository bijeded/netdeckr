import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useArchetypeSelection } from './useArchetypeSelection'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

const param = () => new URLSearchParams(window.location.search).get('a')

describe('useArchetypeSelection', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => setUrl('/'))

  it('defaults to null when the URL has no archetype param', () => {
    const { result } = renderHook(() => useArchetypeSelection())
    expect(result.current.archetype).toBeNull()
  })

  it('reads the archetype from the ?a= param on load', () => {
    setUrl('?f=ST&a=UW+Control')
    const { result } = renderHook(() => useArchetypeSelection())
    expect(result.current.archetype).toBe('UW Control')
  })

  it('treats an empty ?a= as no archetype', () => {
    setUrl('?a=')
    const { result } = renderHook(() => useArchetypeSelection())
    expect(result.current.archetype).toBeNull()
  })

  it('writes the archetype to the URL, preserving the other params', () => {
    setUrl('?f=MO&w=2weeks')
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => result.current.setArchetype('Boros Energy'))
    const params = new URLSearchParams(window.location.search)
    expect(result.current.archetype).toBe('Boros Energy')
    expect(params.get('a')).toBe('Boros Energy')
    expect(params.get('f')).toBe('MO')
    expect(params.get('w')).toBe('2weeks')
  })

  it('round-trips a name with URL-reserved characters', () => {
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => result.current.setArchetype('4/5C Control & Friends'))
    const reloaded = renderHook(() => useArchetypeSelection())
    expect(reloaded.result.current.archetype).toBe('4/5C Control & Friends')
  })

  it('clearing the archetype removes the param', () => {
    setUrl('?f=ST&a=UW+Control')
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => result.current.setArchetype(null))
    expect(result.current.archetype).toBeNull()
    expect(new URLSearchParams(window.location.search).has('a')).toBe(false)
    expect(new URLSearchParams(window.location.search).get('f')).toBe('ST')
  })

  it('replaces the history entry by default', () => {
    const { result } = renderHook(() => useArchetypeSelection())
    const before = window.history.length
    act(() => result.current.setArchetype('UW Control'))
    expect(window.history.length).toBe(before)
  })

  it('adds a history entry when asked to push', () => {
    const { result } = renderHook(() => useArchetypeSelection())
    const before = window.history.length
    act(() => result.current.setArchetype('UW Control', { push: true }))
    expect(window.history.length).toBe(before + 1)
    expect(param()).toBe('UW Control')
  })

  it('syncs the archetype on back/forward navigation', () => {
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => {
      window.history.pushState({}, '', '?a=Dimir+Aggro')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.archetype).toBe('Dimir Aggro')
    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.archetype).toBeNull()
  })
})
