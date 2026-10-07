import { useCallback, useEffect, useRef, useState } from 'react'
import { sensitivityCells, type SensitivityCell } from '../engine/simulate.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { SensitivityMessage, SensitivityRequest } from './sensitivity.worker.ts'

// Runs the sensitivity grid without freezing the page: in a web worker where there is one, and — where a worker
// cannot be made — on the page's own thread, one cell per turn of the event loop so the screen still breathes.
// The cells arrive one at a time; `done` flips when the last has.

export type SensitivityState = {
  status: 'idle' | 'running' | 'done'
  cells: SensitivityCell[]
}

const IDLE: SensitivityState = { status: 'idle', cells: [] }

export function useSensitivity(): { state: SensitivityState; run: (household: Household, assumptions: Assumptions) => void; reset: () => void } {
  const [state, setState] = useState<SensitivityState>(IDLE)
  const stop = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
    stop.current?.()
    stop.current = null
    setState(IDLE)
  }, [])

  const run = useCallback((household: Household, assumptions: Assumptions) => {
    stop.current?.()
    setState({ status: 'running', cells: [] })
    const add = (cell: SensitivityCell) => setState((s) => ({ ...s, status: 'running', cells: [...s.cells, cell] }))
    const finish = () => setState((s) => ({ ...s, status: 'done' }))

    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('./sensitivity.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      worker = null
    }

    if (worker) {
      const w = worker
      w.onmessage = (e: MessageEvent<SensitivityMessage>) => {
        if ('cell' in e.data) add(e.data.cell)
        else {
          finish()
          w.terminate()
        }
      }
      w.onerror = () => {
        w.terminate()
        runOnThisThread()
      }
      w.postMessage({ household, assumptions } satisfies SensitivityRequest)
      stop.current = () => w.terminate()
      return
    }
    runOnThisThread()

    function runOnThisThread() {
      let cancelled = false
      const cells = sensitivityCells(household, assumptions)
      const step = () => {
        if (cancelled) return
        const next = cells.next()
        if (next.done) return finish()
        add(next.value)
        setTimeout(step, 0)
      }
      setState({ status: 'running', cells: [] })
      setTimeout(step, 0)
      stop.current = () => {
        cancelled = true
      }
    }
  }, [])

  useEffect(() => () => stop.current?.(), [])
  return { state, run, reset }
}
