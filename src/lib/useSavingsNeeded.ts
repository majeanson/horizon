import { useEffect, useState } from 'react'
import { savingsNeeded, type SavingsNeeded } from '../engine/savingsNeeded.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { SavingsNeededMessage, SavingsNeededRequest } from './savingsNeeded.worker.ts'

// « How much should I put aside to retire at `age`? », computed in a web worker where there is one (and, where a worker
// cannot be made, on the page's own thread after a turn of the event loop so the screen paints first). The LAST answer
// stays up while a new age recomputes (`busy`), so an edit never swaps the figure for a skeleton under the reader —
// `value` is null only before the very first answer.

export function useSavingsNeeded(household: Household, assumptions: Assumptions, age: number, enabled: boolean): { value: SavingsNeeded | null; busy: boolean } {
  const [answer, setAnswer] = useState<{
    key: string
    value: SavingsNeeded
  } | null>(null)
  const key = JSON.stringify([household, assumptions, age])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let worker: Worker | null = null
    const done = (value: SavingsNeeded) => {
      if (!cancelled) setAnswer({ key, value })
    }
    const onThisThread = () => {
      const timer = setTimeout(() => done(savingsNeeded(household, assumptions, age)), 0)
      return () => clearTimeout(timer)
    }
    let stopFallback: (() => void) | null = null
    // One turn of the event loop before the worker is made: React's development double-mount would otherwise create one and
    // terminate it while its modules are still loading, which leaves requests pending and a page that is never « idle ».
    const begin = () => {
      try {
        worker = new Worker(new URL('./savingsNeeded.worker.ts', import.meta.url), { type: 'module' })
      } catch {
        worker = null
      }
      if (worker) {
        const w = worker
        w.onmessage = (e: MessageEvent<SavingsNeededMessage>) => {
          done(e.data.answer)
          w.terminate()
        }
        w.onerror = () => {
          w.terminate()
          stopFallback = onThisThread()
        }
        w.postMessage({ household, assumptions, age } satisfies SavingsNeededRequest)
      } else {
        stopFallback = onThisThread()
      }
    }
    // A beat behind the page's `now` work: this answer sits far down the page and must not race the verdict and the chart.
    const starter = setTimeout(begin, 300)
    return () => {
      cancelled = true
      clearTimeout(starter)
      worker?.terminate()
      stopFallback?.()
    }
    // `key` stands for the objects: they are rebuilt every render, their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return { value: enabled ? (answer?.value ?? null) : null, busy: enabled && answer?.key !== key }
}
