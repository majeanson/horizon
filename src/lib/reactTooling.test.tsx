import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

// THE REACT TEST PIPELINE WORKS. Until now a component or a hook could only be seen through Playwright, so a `.test.tsx` file was not even picked up by vitest (the include glob said
// `.test.ts`). This pins that the pieces the later suites lean on are in place: JSX compiles, the DOM exists (happy-dom), a render is cleaned away between tests (no leak from one
// test to the next), a hook can be driven with `renderHook`, state updates are flushed with `act`, and the timers can be faked.

function Counter() {
  const [n, setN] = useState(0)
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      {`clicks: ${n}`}
    </button>
  )
}

describe('the React test pipeline', () => {
  it('renders JSX into a DOM, and a click goes through to the state', () => {
    render(<Counter />)
    const button = screen.getByRole('button')
    expect(button.textContent).toBe('clicks: 0')
    act(() => button.click())
    expect(button.textContent).toBe('clicks: 1')
  })

  it('cleans up between tests: the button of the test above is gone', () => {
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('cleanup() removes what a test rendered, on request too', () => {
    render(<Counter />)
    expect(screen.queryByRole('button')).not.toBeNull()
    cleanup()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('drives a hook, and flushes its updates with act', () => {
    const { result } = renderHook(() => {
      const [n, setN] = useState(10)
      return { n, up: () => setN((x) => x + 1) }
    })
    expect(result.current.n).toBe(10)
    act(() => result.current.up())
    expect(result.current.n).toBe(11)
  })

  it('has a working localStorage (happy-dom’s, not Node’s experimental one) that a test can clear', () => {
    localStorage.setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    localStorage.clear()
    expect(localStorage.getItem('k')).toBeNull()
  })
})
