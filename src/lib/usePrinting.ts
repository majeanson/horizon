import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * True from the moment the browser starts to print until it is done. A part of the page that exists ONLY on paper (the year-by-year
 * table and the cited figures a printed plan must carry, whichever view is open) mounts on `beforeprint` — flushed at once, since
 * the browser takes its snapshot as soon as the handler returns — and goes away on `afterprint`, so the screen never pays for it.
 */
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    const start = () => flushSync(() => setPrinting(true))
    const stop = () => setPrinting(false)
    window.addEventListener('beforeprint', start)
    window.addEventListener('afterprint', stop)
    return () => {
      window.removeEventListener('beforeprint', start)
      window.removeEventListener('afterprint', stop)
    }
  }, [])
  return printing
}
