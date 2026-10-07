import { useEffect, useState } from 'react'

// One request answered off the page's thread: in a web worker where there is one, and, where a worker cannot be made, on
// the page's own thread after a turn of the event loop so the screen paints first. It restarts whenever the request's
// CONTENT changes (the key), and the last answer stays on screen meanwhile — a tap must not blank the page — flagged
// `busy`, so the reader of it can say it is being updated and never treat it as the answer to the new question.

export interface Answer<T> {
  value: T | null
  busy: boolean
}

export function useOffThread<Req, Msg, T>(request: Req, makeWorker: () => Worker, compute: () => T, pick: (m: Msg) => T | null, enabled = true, priority: 'now' | 'idle' = 'now'): Answer<T> {
  const [answer, setAnswer] = useState<{ key: string; value: T } | null>(null)
  const key = JSON.stringify(request)

  useEffect(() => {
    if (!enabled) return
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
        worker = makeWorker()
      } catch {
        worker = null
      }
      if (worker) {
        const w = worker
        w.onmessage = (e: MessageEvent<Msg>) => {
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
    // `idle` yields to the page's first paint and the `now` requests: several heavy panels start
    // together at load, and the ones furthest down the page must not race the verdict and the chart.
    const stopStarter =
      priority === 'idle' && typeof requestIdleCallback === 'function'
        ? ((id) => () => cancelIdleCallback(id))(requestIdleCallback(begin, { timeout: 1500 }))
        : ((id) => () => clearTimeout(id))(setTimeout(begin, priority === 'idle' ? 300 : 0))
    return () => {
      cancelled = true
      stopStarter()
      worker?.terminate()
      stopFallback?.()
    }
    // `key` stands for the request: its objects are rebuilt every render, their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, priority])

  return { value: answer?.value ?? null, busy: enabled && answer?.key !== key }
}
