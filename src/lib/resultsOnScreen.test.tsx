import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAsFile } from './download.ts'
import { defaultProfile, type Profile } from './schema.ts'
import { useRuns } from './useRuns.ts'

// RESULTS ON SCREEN, the review of 2026-10-19: what a figure on the page is read against, and what a download leaves behind.

class FakeWorker {
  static all: FakeWorker[] = []
  onmessage: ((e: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  posted: unknown[] = []
  constructor() {
    FakeWorker.all.push(this)
  }
  postMessage(m: unknown) {
    this.posted.push(m)
  }
  terminate() {}
  say(data: unknown) {
    this.onmessage?.({ data })
  }
}

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

const today = { year: 2026, month: 10 }
const withInflation = (inflation: number): Profile => {
  const p = defaultProfile(today)
  return { ...p, assumptions: { ...p.assumptions, inflation } }
}

describe('the runs on screen and the profile they were projected from', () => {
  it('the basis is the request the held answer belongs to — kept while a new one is worked out, moved only when it lands', () => {
    const a = withInflation(0.021)
    const b = withInflation(0.035)
    const { result, rerender } = renderHook(({ p }) => useRuns(p, today, ['plan'], true), { initialProps: { p: a } })
    expect(result.current.basis).toBeNull() // nothing held yet: nothing to read against
    act(() => void vi.advanceTimersByTime(0))
    act(() => FakeWorker.all[0].say([{ selection: 'plan', result: 'A' }]))
    expect(result.current.busy).toBe(false)
    expect(result.current.basis).toBe(a)
    // the person changes inflation: the runs on screen are still A's — and so must be what they are deflated with
    rerender({ p: b })
    expect(result.current.busy).toBe(true)
    expect(result.current.basis).toBe(a)
    act(() => void vi.advanceTimersByTime(1000))
    act(() => FakeWorker.all[FakeWorker.all.length - 1].say([{ selection: 'plan', result: 'B' }]))
    expect(result.current.busy).toBe(false)
    expect(result.current.basis).toBe(b)
  })
})

describe('a file handed to the browser', () => {
  it('its link is IN the page while clicked, and its address outlives the click (iOS fetches after click() returns)', () => {
    const created: string[] = []
    const revoked: string[] = []
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: () => (created.push('blob:x'), 'blob:x'), revokeObjectURL: (u: string) => void revoked.push(u) }))
    let attachedWhenClicked = false
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      attachedWhenClicked = document.body.contains(this)
    })
    saveAsFile('a,b\n1,2', 'plan.csv', 'text/csv;charset=utf-8')
    expect(click).toHaveBeenCalledTimes(1)
    expect(attachedWhenClicked).toBe(true)
    expect(revoked).toEqual([]) // not yet: the download has not been fetched
    vi.advanceTimersByTime(1000)
    expect(revoked).toEqual(['blob:x'])
    expect(document.querySelectorAll('a[download]').length).toBe(0) // and the page keeps no stray link
    click.mockRestore()
  })
})
