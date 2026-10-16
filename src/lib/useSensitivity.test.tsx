import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { sensitivityCells } from '../engine/simulate.ts'
import { useSensitivity } from './useSensitivity.ts'

// THE GRID THAT ARRIVES A CELL AT A TIME. The sensitivity grid is the slowest thing the results page asks for, so it is streamed: a worker posts each cell as it is worked out and a last message that says it is
// done. The hook must show the cells as they come, in order; stop a run that is superseded or reset (a cell from the old run must never land in the new one); stop when the page leaves; and, where a worker
// cannot be had, do the same on the page's own thread a cell per turn so the screen keeps breathing — arriving at the very cells the engine produces. A fake worker is driven message by message; like a real
// browser's, it delivers nothing once it has been terminated.

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
    if (!this.terminated) this.onmessage?.({ data })
  }
}

const { household, assumptions } = EXAMPLES.modest
const cell = (n: number) => ({ cell: { n } as never })
const flush = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  FakeWorker.all = []
  vi.useFakeTimers()
  vi.stubGlobal('Worker', FakeWorker)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('with a worker', () => {
  it('idle until asked; asking starts a worker with the household and the assumptions, and shows « running » with no cells yet', () => {
    const { result } = renderHook(() => useSensitivity())
    expect(result.current.state).toEqual({ status: 'idle', cells: [] })
    act(() => result.current.run(household, assumptions))
    expect(result.current.state).toEqual({ status: 'running', cells: [] })
    expect(FakeWorker.all).toHaveLength(1)
    expect(FakeWorker.all[0].posted).toEqual([{ household, assumptions }])
  })

  it('the cells appear as they are posted, in order, and the last message makes it « done » and lets the worker go', () => {
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    const w = FakeWorker.all[0]
    act(() => w.say(cell(1)))
    act(() => w.say(cell(2)))
    expect(result.current.state.status).toBe('running')
    expect(result.current.state.cells).toEqual([{ n: 1 }, { n: 2 }])
    act(() => w.say(cell(3)))
    act(() => w.say({ done: true }))
    expect(result.current.state).toEqual({ status: 'done', cells: [{ n: 1 }, { n: 2 }, { n: 3 }] })
    expect(w.terminated).toBe(true)
  })

  it('asking again mid-run lets the old worker go and starts the new run from nothing: an old cell never lands in the new run', () => {
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    const first = FakeWorker.all[0]
    act(() => first.say(cell(1)))
    act(() => result.current.run(household, assumptions))
    expect(first.terminated).toBe(true)
    expect(FakeWorker.all).toHaveLength(2)
    expect(result.current.state).toEqual({ status: 'running', cells: [] })
    act(() => first.say(cell(99))) // a late cell of the old run: nothing arrives from a terminated worker
    act(() => FakeWorker.all[1].say(cell(7)))
    expect(result.current.state.cells).toEqual([{ n: 7 }])
  })

  it('reset stops the run and goes back to idle with nothing', () => {
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    act(() => FakeWorker.all[0].say(cell(1)))
    act(() => result.current.reset())
    expect(FakeWorker.all[0].terminated).toBe(true)
    expect(result.current.state).toEqual({ status: 'idle', cells: [] })
  })

  it('the page leaving stops the worker, and what it would still say changes nothing', () => {
    const { result, unmount } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    const w = FakeWorker.all[0]
    unmount()
    expect(w.terminated).toBe(true)
    expect(() => w.say(cell(1))).not.toThrow()
  })
})

describe('where a worker cannot be made', () => {
  const noWorker = () =>
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('no workers here')
        }
      },
    )

  it('the page does it itself, a cell per turn, and ends with exactly the cells the engine produces', () => {
    noWorker()
    const expected = [...sensitivityCells(household, assumptions)]
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    expect(result.current.state).toEqual({ status: 'running', cells: [] })
    flush(1) // the first turns: some cells, not all of them at once
    expect(result.current.state.cells.length).toBeGreaterThanOrEqual(1)
    expect(result.current.state.cells.length).toBeLessThan(expected.length)
    for (let i = 0; i < expected.length + 2; i++) flush(1)
    expect(result.current.state.status).toBe('done')
    expect(result.current.state.cells).toEqual(expected)
  }, 120_000)

  it('asking again, or resetting, stops the run: no cell arrives after it', () => {
    noWorker()
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    flush(1)
    flush(1)
    const seen = result.current.state.cells.length
    act(() => result.current.reset())
    flush(50)
    expect(result.current.state).toEqual({ status: 'idle', cells: [] })
    expect(seen).toBeGreaterThan(0)
  }, 120_000)
})

describe('a worker that fails', () => {
  it('is let go and the page does the run itself from the start, discarding what the worker had sent', () => {
    const { result } = renderHook(() => useSensitivity())
    act(() => result.current.run(household, assumptions))
    const w = FakeWorker.all[0]
    act(() => w.say(cell(1)))
    act(() => w.onerror?.())
    expect(w.terminated).toBe(true)
    expect(result.current.state).toEqual({ status: 'running', cells: [] })
    flush(1)
    expect(result.current.state.cells.length).toBeGreaterThanOrEqual(1)
    expect(result.current.state.cells[0]).not.toEqual({ n: 1 })
  }, 120_000)
})
