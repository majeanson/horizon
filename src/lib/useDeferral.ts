import { useEffect, useState } from 'react'
import { deferralView, type DeferralView } from '../engine/deferral.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DeferralMessage, DeferralRequest } from './deferral.worker.ts'

// The « when should I start my pension? » comparison, computed in a web worker where there is one (and, where a worker
// cannot be made, on the page's own thread after a turn of the event loop so the screen paints first). `null` while it
// runs, so the page can show a placeholder of the right shape. It starts when the panel is MOUNTED — the panel sits
// behind a disclosure, so nobody pays for it who does not open it.

export function useDeferral(household: Household, assumptions: Assumptions): DeferralView | null {
  const [answer, setAnswer] = useState<{ key: string; view: DeferralView } | null>(null)
  const key = JSON.stringify([household, assumptions])

  useEffect(() => {
    let cancelled = false
    let worker: Worker | null = null
    let stopFallback: (() => void) | null = null
    const done = (view: DeferralView) => {
      if (!cancelled) setAnswer({ key, view })
    }
    const onThisThread = () => {
      const timer = setTimeout(() => done(deferralView(household, assumptions)), 0)
      return () => clearTimeout(timer)
    }
    // One turn of the event loop before the worker is made: React's development double-mount would otherwise create one and
    // terminate it while its modules are still loading, which leaves requests pending and a page that is never « idle ».
    const begin = () => {
      try {
        worker = new Worker(new URL('./deferral.worker.ts', import.meta.url), { type: 'module' })
      } catch {
        worker = null
      }
      if (worker) {
        const w = worker
        w.onmessage = (e: MessageEvent<DeferralMessage>) => {
          done(e.data.view)
          w.terminate()
        }
        w.onerror = () => {
          w.terminate()
          stopFallback = onThisThread()
        }
        w.postMessage({ household, assumptions } satisfies DeferralRequest)
      } else {
        stopFallback = onThisThread()
      }
    }
    const starter = setTimeout(begin, 0)
    return () => {
      cancelled = true
      clearTimeout(starter)
      worker?.terminate()
      stopFallback?.()
    }
    // `key` stands for the two objects: they are rebuilt every render, their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return answer?.key === key ? answer.view : null
}
