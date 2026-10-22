import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useKeepWhenHidden } from './useKeepWhenHidden.ts'

// A figure typed and never blurred is kept when the page goes away; a box not being typed in, or the page merely staying visible, keeps nothing.

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const hide = () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useKeepWhenHidden', () => {
  it('commits what is being typed when the page is hidden, and on pagehide', () => {
    const commit = vi.fn()
    renderHook(() => useKeepWhenHidden(() => true, commit))
    hide()
    expect(commit).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('pagehide'))
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('commits nothing when nothing is being typed, or when the page stays visible', () => {
    const idle = vi.fn()
    renderHook(() => useKeepWhenHidden(() => false, idle))
    hide()
    window.dispatchEvent(new Event('pagehide'))
    expect(idle).not.toHaveBeenCalled()

    cleanup()
    const typing = vi.fn()
    renderHook(() => useKeepWhenHidden(() => true, typing))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(typing).not.toHaveBeenCalled()
  })

  it('stops listening when the box is gone', () => {
    const commit = vi.fn()
    const { unmount } = renderHook(() => useKeepWhenHidden(() => true, commit))
    unmount()
    window.dispatchEvent(new Event('pagehide'))
    expect(commit).not.toHaveBeenCalled()
  })

  it('uses the latest commit, not the one of the first render', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ c }) => useKeepWhenHidden(() => true, c), { initialProps: { c: first } })
    rerender({ c: second })
    window.dispatchEvent(new Event('pagehide'))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
