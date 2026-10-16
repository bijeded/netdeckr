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

  it('leaving a pushed entry steps back through history', async () => {
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => result.current.setArchetype('UW Control', { push: true }))
    const lengthAfterPush = window.history.length

    await act(async () => {
      const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
      result.current.leaveArchetype()
      await popped
    })
    expect(result.current.archetype).toBeNull()
    expect(param()).toBeNull()
    // Went back rather than adding or rewriting an entry.
    expect(window.history.length).toBe(lengthAfterPush)
  })

  it('a pushed entry stays recognizable after an in-place change', async () => {
    const { result } = renderHook(() => useArchetypeSelection())
    act(() => result.current.setArchetype('UW Control', { push: true }))
    act(() => result.current.setArchetype('Dimir Aggro'))

    await act(async () => {
      const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
      result.current.leaveArchetype()
      await popped
    })
    expect(result.current.archetype).toBeNull()
  })

  it('leaving an entry it did not push clears the param in place', () => {
    setUrl('?f=ST&a=UW+Control')
    const { result } = renderHook(() => useArchetypeSelection())
    const before = window.history.length
    act(() => result.current.leaveArchetype())
    expect(result.current.archetype).toBeNull()
    expect(param()).toBeNull()
    expect(new URLSearchParams(window.location.search).get('f')).toBe('ST')
    expect(window.history.length).toBe(before)
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

  describe('tab', () => {
    const tabParam = () => new URLSearchParams(window.location.search).get('tab')

    it('defaults to Lists with no tab param', () => {
      setUrl('?a=UW+Control')
      const { result } = renderHook(() => useArchetypeSelection())
      expect(result.current.tab).toBe('lists')
    })

    it('restores the Analysis tab from a link', () => {
      setUrl('?f=ST&a=UW+Control&tab=analysis')
      const { result } = renderHook(() => useArchetypeSelection())
      expect(result.current.tab).toBe('analysis')
      expect(tabParam()).toBe('analysis')
    })

    it('drops an unknown tab value and falls back to Lists', () => {
      setUrl('?a=UW+Control&tab=stats')
      const { result } = renderHook(() => useArchetypeSelection())
      expect(result.current.tab).toBe('lists')
      expect(tabParam()).toBeNull()
      expect(param()).toBe('UW Control')
    })

    it('drops a tab param without an archetype', () => {
      setUrl('?f=ST&tab=analysis')
      const { result } = renderHook(() => useArchetypeSelection())
      expect(result.current.tab).toBe('lists')
      expect(tabParam()).toBeNull()
    })

    it('opens the analysis in one pushed history entry', () => {
      setUrl('?f=ST')
      const { result } = renderHook(() => useArchetypeSelection())
      const before = window.history.length
      act(() => result.current.setArchetype('UW Control', { push: true, tab: 'analysis' }))
      expect(window.history.length).toBe(before + 1)
      expect(result.current.tab).toBe('analysis')
      expect(param()).toBe('UW Control')
      expect(tabParam()).toBe('analysis')
    })

    it('selects Lists when isolating without a tab', () => {
      setUrl('?a=UW+Control&tab=analysis')
      const { result } = renderHook(() => useArchetypeSelection())
      act(() => result.current.setArchetype('Dimir Aggro'))
      expect(result.current.tab).toBe('lists')
      expect(tabParam()).toBeNull()
    })

    it('switches tabs without stacking history', () => {
      setUrl('?a=UW+Control')
      const { result } = renderHook(() => useArchetypeSelection())
      const before = window.history.length
      act(() => result.current.setTab('analysis'))
      act(() => result.current.setTab('lists'))
      act(() => result.current.setTab('analysis'))
      expect(window.history.length).toBe(before)
      expect(tabParam()).toBe('analysis')
    })

    it('leaving the archetype removes both params', () => {
      setUrl('?f=ST&a=UW+Control&tab=analysis')
      const { result } = renderHook(() => useArchetypeSelection())
      act(() => result.current.leaveArchetype())
      expect(param()).toBeNull()
      expect(tabParam()).toBeNull()
      expect(result.current.tab).toBe('lists')
    })

    it('ignores a tab switch with no archetype isolated', () => {
      const { result } = renderHook(() => useArchetypeSelection())
      act(() => result.current.setTab('analysis'))
      expect(result.current.tab).toBe('lists')
      expect(tabParam()).toBeNull()
    })
  })
})
