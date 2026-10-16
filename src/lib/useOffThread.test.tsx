import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOffThread } from './useOffThread.ts'

// THE HOOK THAT EVERY HEAVY PANEL STANDS ON. A question goes to a worker; the last answer stays on screen while a new one is worked out (flagged busy: it must never read as the answer to the new
// question); a question that is RE-asked waits a beat for the hand to stop (a slider on a held key writes the profile many times a second, and a worker spawned and killed for each starved the page);
// where a worker cannot be made the same thing happens on the page's own thread; and nothing a worker says after it was cancelled — or after the page left — reaches the screen. None of this was
// seen outside a browser. Here the worker is a fake the test drives message by message, and time is a clock the test advances.

class FakeWorker {
  static all: FakeWorker[] = []
  onmessage: ((e: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  posted: unknown[] = []
  terminated = false
  constructor() {
    FakeWorker.all.push(this)
  }
  postMessage(m: unknown) {
    this.posted.push(m)
  }
  terminate() {
    this.terminated = true
  }
  say(data: unknown) {
    this.onmessage?.({ data })
  }
}
const make = () => new FakeWorker() as unknown as Worker
const pickValue = (m: { v: number | null }) => m.v

interface Props {
  req: { n: number }
  enabled?: boolean
  priority?: 'now' | 'idle'
  worker?: () => Worker
  compute?: () => number
}
const useIt = (p: Props) => useOffThread<{ n: number }, { v: number | null }, number>(p.req, p.worker ?? make, p.compute ?? (() => -1), pickValue, p.enabled ?? true, p.priority ?? 'now')
const flush = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  FakeWorker.all = []
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup() // while the stubs the hook may need to cancel with are still there
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the first question', () => {
  it('is not answered at once, starts a worker after one turn of the event loop, and posts the request to it', () => {
    const { result } = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    expect(result.current).toEqual({ value: null, busy: true })
    expect(FakeWorker.all).toHaveLength(0)
    flush(0)
    expect(FakeWorker.all).toHaveLength(1)
    expect(FakeWorker.all[0].posted).toEqual([{ n: 1 }])
  })

  it('shows the answer the worker gives, stops being busy, and lets the worker go', () => {
    const { result } = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    flush(0)
    act(() => FakeWorker.all[0].say({ v: 42 }))
    expect(result.current).toEqual({ value: 42, busy: false })
    expect(FakeWorker.all[0].terminated).toBe(true)
  })

  it('a message the page does not recognise (pick says null) is no answer, and the worker still goes', () => {
    const { result } = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    flush(0)
    act(() => FakeWorker.all[0].say({ v: null }))
    expect(result.current).toEqual({ value: null, busy: true })
    expect(FakeWorker.all[0].terminated).toBe(true)
  })
})

describe('where a worker cannot be had', () => {
  it('a worker that cannot be made is answered on the page’s own thread, after a turn so the screen paints first', () => {
    const compute = vi.fn(() => 7)
    const { result } = renderHook(useIt, {
      initialProps: {
        req: { n: 1 },
        compute,
        worker: () => {
          throw new Error('no workers here')
        },
      },
    })
    expect(compute).not.toHaveBeenCalled()
    flush(0) // begin()
    expect(compute).not.toHaveBeenCalled()
    flush(1) // the fallback's own turn
    expect(compute).toHaveBeenCalledTimes(1)
    expect(result.current).toEqual({ value: 7, busy: false })
  })

  it('a worker that fails is let go and the page answers itself', () => {
    const compute = vi.fn(() => 9)
    const { result } = renderHook(useIt, { initialProps: { req: { n: 1 }, compute } })
    flush(0)
    act(() => FakeWorker.all[0].onerror?.())
    expect(FakeWorker.all[0].terminated).toBe(true)
    flush(0)
    expect(result.current).toEqual({ value: 9, busy: false })
  })
})

describe('a question that is not asked yet', () => {
  it('disabled: no worker, no answer, and not « busy » (nothing is being worked out)', () => {
    const { result } = renderHook(useIt, { initialProps: { req: { n: 1 }, enabled: false } })
    flush(5_000)
    expect(FakeWorker.all).toHaveLength(0)
    expect(result.current).toEqual({ value: null, busy: false })
  })

  it('enabled later: the question is asked then', () => {
    const { result, rerender } = renderHook(useIt, { initialProps: { req: { n: 1 }, enabled: false } })
    rerender({ req: { n: 1 }, enabled: true })
    flush(0)
    expect(FakeWorker.all).toHaveLength(1)
    act(() => FakeWorker.all[0].say({ v: 3 }))
    expect(result.current.value).toBe(3)
  })
})

describe('a question that is RE-asked', () => {
  const answerFirst = () => {
    const hook = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    flush(0)
    act(() => FakeWorker.all[0].say({ v: 10 }))
    return hook
  }

  it('keeps the last answer on screen, flagged busy, while the new one is worked out — never as the answer to the new question', () => {
    const { result, rerender } = answerFirst()
    rerender({ req: { n: 2 } })
    expect(result.current).toEqual({ value: 10, busy: true })
  })

  it('waits 350 ms for the hand to stop: no worker at 349, one at 350', () => {
    const { rerender } = answerFirst()
    rerender({ req: { n: 2 } })
    flush(349)
    expect(FakeWorker.all).toHaveLength(1)
    flush(1)
    expect(FakeWorker.all).toHaveLength(2)
    expect(FakeWorker.all[1].posted).toEqual([{ n: 2 }])
  })

  it('a burst of changes (a held arrow key) starts ONE worker, for the last of them', () => {
    const { rerender } = answerFirst()
    for (const n of [2, 3, 4, 5, 6]) {
      rerender({ req: { n } })
      flush(100)
    }
    flush(400)
    expect(FakeWorker.all).toHaveLength(2) // the first answer's, and one for the last question
    expect(FakeWorker.all[1].posted).toEqual([{ n: 6 }])
  })

  it('the new answer replaces the old and clears busy', () => {
    const { result, rerender } = answerFirst()
    rerender({ req: { n: 2 } })
    flush(350)
    act(() => FakeWorker.all[1].say({ v: 20 }))
    expect(result.current).toEqual({ value: 20, busy: false })
  })

  it('the SAME question rebuilt as a new object (its content unchanged) is not asked again', () => {
    const { rerender, result } = answerFirst()
    rerender({ req: { n: 1 } })
    flush(2_000)
    expect(FakeWorker.all).toHaveLength(1)
    expect(result.current).toEqual({ value: 10, busy: false })
  })

  it('a worker still thinking about the OLD question is let go, and what it says late is ignored', () => {
    const { result, rerender } = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    flush(0)
    const old = FakeWorker.all[0]
    rerender({ req: { n: 2 } })
    expect(old.terminated).toBe(true)
    act(() => old.say({ v: 111 }))
    expect(result.current.value, 'the old question’s answer reached the screen').toBeNull()
  })
})

describe('the page leaves', () => {
  it('unmounting lets the worker go, cancels a question not yet sent, and a late message changes nothing', () => {
    const { unmount, result } = renderHook(useIt, { initialProps: { req: { n: 1 } } })
    flush(0)
    const w = FakeWorker.all[0]
    unmount()
    expect(w.terminated).toBe(true)
    expect(() => w.say({ v: 5 })).not.toThrow()
    expect(result.current.value).toBeNull()

    const second = renderHook(useIt, { initialProps: { req: { n: 2 } } })
    second.unmount()
    flush(1_000)
    expect(FakeWorker.all).toHaveLength(1) // the second never made one
  })
})

describe('idle priority', () => {
  it('waits for the browser to be idle when it can say so, and starts then', () => {
    const idle = vi.fn((cb: () => void) => {
      setTimeout(cb, 50)
      return 1
    })
    vi.stubGlobal('requestIdleCallback', idle)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    renderHook(useIt, { initialProps: { req: { n: 1 }, priority: 'idle' as const } })
    expect(idle).toHaveBeenCalledTimes(1)
    expect(FakeWorker.all).toHaveLength(0)
    flush(50)
    expect(FakeWorker.all).toHaveLength(1)
  })

  it('without requestIdleCallback it waits 300 ms instead', () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    renderHook(useIt, { initialProps: { req: { n: 1 }, priority: 'idle' as const } })
    flush(299)
    expect(FakeWorker.all).toHaveLength(0)
    flush(1)
    expect(FakeWorker.all).toHaveLength(1)
  })
})
