import { useEffect, useState } from 'react'
import { bridgeMatrix, bridgeView, type BridgeLevers, type BridgeView } from '../engine/bridge.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { BridgeMatrix, BridgeMessage, BridgeRequest } from './bridge.worker.ts'

// The « Mes années 60 à 70 » view, computed in a web worker where there is one (and, where a worker cannot be made, on
// the page's own thread after a turn of the event loop so the screen paints first). It restarts whenever the levers or the
// household change: a change of age on the page is a new question, so the previous answer is shown only as « busy », never as if
// it still applied — and a tap on a chip must not blank the page, so the last answer stays on screen meanwhile.

interface Answer<T> {
  value: T | null
  busy: boolean
}

function useOffThread<T>(request: BridgeRequest, compute: () => T, pick: (m: BridgeMessage) => T | null): Answer<T> {
  const [answer, setAnswer] = useState<{ key: string; value: T } | null>(null)
  const key = JSON.stringify(request)

  useEffect(() => {
    let cancelled = false
    let worker: Worker | null = null
    let stopFallback: (() => void) | null = null
    const done = (value: T) => {
      if (!cancelled) setAnswer({ key, value })
    }
    const onThisThread = () => {
      const timer = setTimeout(() => done(compute()), 0)
      return () => clearTimeout(timer)
    }
    // One turn of the event loop before the worker is made: React's development double-mount would otherwise create one and
    // terminate it while its modules are still loading, which leaves requests pending and a page that is never « idle ».
    const begin = () => {
      try {
        worker = new Worker(new URL('./bridge.worker.ts', import.meta.url), { type: 'module' })
      } catch {
        worker = null
      }
      if (worker) {
        const w = worker
        w.onmessage = (e: MessageEvent<BridgeMessage>) => {
          const value = pick(e.data)
          if (value !== null) done(value)
          w.terminate()
        }
        w.onerror = () => {
          w.terminate()
          stopFallback = onThisThread()
        }
        w.postMessage(request)
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
    // `key` stands for the request: its objects are rebuilt every render, their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { value: answer?.value ?? null, busy: answer?.key !== key }
}

/** The plan being tested and the five strategies beside it. */
export function useBridge(household: Household, assumptions: Assumptions, levers: BridgeLevers): Answer<BridgeView> {
  return useOffThread<BridgeView>(
    { household, assumptions, levers, what: 'view' },
    () => bridgeView(household, assumptions, levers),
    (m) => (m.what === 'view' ? m.view : null),
  )
}

/** Whether each strategy lasts under the three sets of assumptions — fifteen projections, only mounted when asked for. */
export function useBridgeMatrix(household: Household, assumptions: Assumptions, levers: BridgeLevers): Answer<BridgeMatrix> {
  return useOffThread<BridgeMatrix>(
    { household, assumptions, levers, what: 'matrix' },
    () => bridgeMatrix(household, assumptions, levers),
    (m) => (m.what === 'matrix' ? m.matrix : null),
  )
}
