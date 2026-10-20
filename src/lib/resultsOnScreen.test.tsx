import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReverseView } from '../components/results/ReverseView.tsx'
import { SaveView } from '../components/results/SaveView.tsx'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { saveAsFile } from './download.ts'
import { RESULTS_COPY } from './resultsCopy.ts'
import { REVERSE_COPY } from './reverseCopy.ts'
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

describe('a figure held while a new age is worked out says the age it was worked out FOR', () => {
  const noop = () => {}
  const props = { household: GOLDEN_HOUSEHOLD, assumptions: GOLDEN_ASSUMPTIONS, onAge: noop, minAge: 50, maxAge: 70 }
  const workerFor = (what: (posted: unknown) => boolean) => FakeWorker.all.filter((w) => w.posted.some(what)).at(-1)!

  it('« Viser un âge »: the levers for 60, held while 65 is worked out, are worded for 60 — never « -2 years »', () => {
    const c = REVERSE_COPY.fr
    const { container, rerender } = render(<ReverseView {...props} age={60} />)
    act(() => void vi.advanceTimersByTime(2000))
    const reverse = workerFor((m) => (m as { what?: string }).what === 'reverse')
    act(() => reverse.say({ what: 'reverse', answer: { age: 60, works: false, spend: { current: 60_000, max: null }, save: null, earliest: 63, partTime: null, returns: null } }))
    expect(container.textContent).toContain(c.needs(60))
    rerender(<ReverseView {...props} age={65} />) // the slider moved: 65 is being worked out, 60's answer is still the one held
    expect(container.textContent).toContain(c.needs(60))
    expect(container.textContent).not.toContain(c.needs(65))
    expect(container.textContent).toContain(c.work(63, 3))
    expect(container.textContent).not.toContain(c.work(63, -2))
  })

  it('« Combien épargner ? »: the amount for 61, held while 62 is worked out, is « to retire at 61 »', () => {
    const q = RESULTS_COPY.fr.questions.save
    const { container, rerender } = render(<SaveView {...props} age={61} />)
    act(() => void vi.advanceTimersByTime(2000))
    act(() => FakeWorker.all.at(-1)!.say({ answer: { age: 61, extraPerYear: 1200 } }))
    expect(container.textContent).toContain(q.why(61))
    rerender(<SaveView {...props} age={62} />)
    expect(container.textContent).toContain(q.why(61))
    expect(container.textContent).not.toContain(q.why(62))
  })
})
