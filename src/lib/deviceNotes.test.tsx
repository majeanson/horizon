import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// THE NOTES KEPT ON THIS DEVICE BESIDE THE PROFILE — « J'ai un régime de retraite » (situation.ts) and the documents ticked (documentsTicks.ts). Each says that
// when the browser keeps nothing, the answer « lives until the page closes ». It did not: a refused write dropped the cache and the next read went back to
// storage — the OLD answer — so a topic could not be turned on at all in a private window or on a full disk. A storage that refuses every write, here.

function refusingStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

beforeEach(() => {
  vi.resetModules() // each module keeps its notes in module state: a fresh one per test
  vi.stubGlobal('localStorage', refusingStorage())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('a browser that keeps nothing', () => {
  it('« oui » to a topic still opens its section, for the rest of the visit', async () => {
    const { answer, useYes } = await import('./situation.ts')
    const { result } = renderHook(() => useYes())
    expect(result.current.has('pension:self')).toBe(false)
    act(() => answer('pension', true, 'self'))
    expect(result.current.has('pension:self')).toBe(true)
    act(() => answer('kids', true))
    expect([...result.current].sort()).toEqual(['kids', 'pension:self'])
    act(() => answer('pension', false, 'self'))
    expect([...result.current]).toEqual(['kids'])
  })

  it('a document ticked stays ticked, and clearing clears it', async () => {
    const { toggleTick, clearTicks, useTicks } = await import('./documentsTicks.ts')
    const { result } = renderHook(() => useTicks())
    act(() => toggleTick('releve'))
    expect(result.current.has('releve')).toBe(true)
    act(() => toggleTick('avis'))
    expect([...result.current].sort()).toEqual(['avis', 'releve'])
    act(() => clearTicks())
    expect(result.current.size).toBe(0)
  })
})
