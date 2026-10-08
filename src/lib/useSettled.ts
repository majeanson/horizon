import { useEffect, useState } from 'react'

// A value that follows another once it has STOPPED changing for `ms`: the first value at once — a page's first answer is
// never late — and every later change only after the hand has rested. The thirty-odd projections behind the answer on
// Résultats run on the page's own thread; a slider held on the arrow key, a figure typed digit by digit, write the profile
// at every step, and re-running them at every step froze the page for the length of the gesture (on a two-core machine,
// a second per step). Deprioritising the work (useDeferredValue) is not enough: a block of projections inside one
// component cannot be interrupted once begun. Not running it until the hand stops is.
export function useSettled<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (Object.is(value, settled)) return
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, settled, ms])
  return settled
}
