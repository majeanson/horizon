import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettled } from './useSettled'

// The hook behind the answer's debounce (pages/Resultats.tsx): the first value at once, a change only once it has rested.

let root: Root
let host: HTMLDivElement
let seen: unknown[] = []

function Probe({ value }: { value: unknown }) {
  seen.push(useSettled(value, 300))
  return null
}

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  seen = []
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const render = (value: unknown) => act(() => root.render(createElement(Probe, { value })))
const last = () => seen[seen.length - 1]

describe('useSettled', () => {
  it('gives the first value at once', () => {
    render('a')
    expect(last()).toBe('a')
  })

  it('holds the old value until the new one has rested for the delay', () => {
    render('a')
    render('b')
    expect(last()).toBe('a')
    act(() => vi.advanceTimersByTime(299))
    expect(last()).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(last()).toBe('b')
  })

  it('a change during the wait restarts it: twenty quick steps settle ONCE, on the last', () => {
    render(0)
    for (let i = 1; i <= 20; i++) {
      render(i)
      act(() => vi.advanceTimersByTime(50))
    }
    expect(last()).toBe(0)
    act(() => vi.advanceTimersByTime(300))
    expect(last()).toBe(20)
    // Nothing between 0 and 20 was ever handed out.
    expect(new Set(seen)).toEqual(new Set([0, 20]))
  })

  it('a value that returns to the settled one before the delay cancels the wait', () => {
    render('a')
    render('b')
    render('a')
    act(() => vi.advanceTimersByTime(1000))
    expect(seen.filter((v) => v === 'b')).toHaveLength(0)
  })
})
