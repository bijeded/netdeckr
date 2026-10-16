import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePlayerViewSelection } from './usePlayerViewSelection'

function setUrl(search: string) {
  window.history.replaceState({}, '', search || '/')
}

const params = () => new URLSearchParams(window.location.search)

describe('usePlayerViewSelection', () => {
  beforeEach(() => setUrl('/'))
  afterEach(() => {
    setUrl('/')
    vi.restoreAllMocks()
  })

  it('is closed when the URL has no view param', () => {
    const { result } = renderHook(() => usePlayerViewSelection())
    expect(result.current.open).toBe(false)
    expect(result.current.player).toBeNull()
  })

  it('reads a shared Players link', () => {
    setUrl('?f=MO&v=players')
    const { result } = renderHook(() => usePlayerViewSelection())
    expect(result.current.open).toBe(true)
    expect(result.current.player).toBeNull()
  })

  it('reads a shared Player link', () => {
    setUrl('?f=PAU&v=players&p=Luminati')
    const { result } = renderHook(() => usePlayerViewSelection())
    expect(result.current).toMatchObject({ open: true, player: 'Luminati' })
  })

  it('drops an unknown view value and its player', () => {
    setUrl('?f=ST&v=decks&p=Someone')
    const { result } = renderHook(() => usePlayerViewSelection())
    expect(result.current.open).toBe(false)
    expect(params().has('v')).toBe(false)
    expect(params().has('p')).toBe(false)
    expect(params().get('f')).toBe('ST')
  })

  it('drops a player param outside the Players view', () => {
    setUrl('?p=Someone')
    renderHook(() => usePlayerViewSelection())
    expect(params().has('p')).toBe(false)
  })

  it('round-trips a name with spaces and URL-reserved characters', () => {
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.openPlayer('Bruno Guerra / Team & Co'))
    const reloaded = renderHook(() => usePlayerViewSelection())
    expect(reloaded.result.current.player).toBe('Bruno Guerra / Team & Co')
  })

  it('preserves the format, window and archetype params on every write', () => {
    setUrl('?f=MO&w=7days&a=Boros+Energy')
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.openPlayers())
    act(() => result.current.openPlayer('rastaf'))
    act(() => result.current.clearPlayer())
    act(() => result.current.leave())
    for (const [key, value] of [['f', 'MO'], ['w', '7days'], ['a', 'Boros Energy']]) {
      expect(params().get(key)).toBe(value)
    }
  })

  it('pushes a history entry only when asked', () => {
    const push = vi.spyOn(window.history, 'pushState')
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.openPlayers())
    expect(push).not.toHaveBeenCalled()
    act(() => result.current.openPlayer('rastaf', { push: true }))
    expect(push).toHaveBeenCalledTimes(1)
    expect(params().get('v')).toBe('players')
    expect(params().get('p')).toBe('rastaf')
  })

  it('leave steps back through history on a pushed entry', () => {
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.openPlayers({ push: true }))
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    act(() => result.current.leave())
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('leave clears in place one level at a time on a shared link', () => {
    setUrl('?f=PAU&v=players&p=Luminati')
    const back = vi.spyOn(window.history, 'back')
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.leave())
    expect(result.current).toMatchObject({ open: true, player: null })
    expect(params().has('p')).toBe(false)
    act(() => result.current.leave())
    expect(result.current.open).toBe(false)
    expect(params().has('v')).toBe(false)
    expect(back).not.toHaveBeenCalled()
  })

  it('clearPlayer keeps the Players view open', () => {
    setUrl('?v=players&p=Luminati')
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.clearPlayer())
    expect(result.current).toMatchObject({ open: true, player: null })
    expect(params().get('v')).toBe('players')
  })

  it('follows browser Back', () => {
    const { result } = renderHook(() => usePlayerViewSelection())
    act(() => result.current.openPlayers({ push: true }))
    act(() => {
      setUrl('/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.open).toBe(false)
  })
})
