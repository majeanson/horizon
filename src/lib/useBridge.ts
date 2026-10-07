import { bridgeMatrix, bridgeView, type BridgeLevers, type BridgeView } from '../engine/bridge.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { BridgeMatrix, BridgeMessage, BridgeRequest } from './bridge.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// The « Mes années 60 à 70 » view, computed off the page's thread (lib/useOffThread.ts). A change of age on the page is a new
// question: the previous answer stays on screen, marked `busy`, and the panel reads it through the levers it was computed for.

const makeWorker = () => new Worker(new URL('./bridge.worker.ts', import.meta.url), { type: 'module' })

/** The plan being tested and the five strategies beside it. */
export function useBridge(household: Household, assumptions: Assumptions, levers: BridgeLevers): Answer<BridgeView> {
  return useOffThread<BridgeRequest, BridgeMessage, BridgeView>(
    { household, assumptions, levers, what: 'view' },
    makeWorker,
    () => bridgeView(household, assumptions, levers),
    (m) => (m.what === 'view' ? m.view : null),
  )
}

/** Whether each strategy lasts under the three sets of assumptions — fifteen projections, only mounted when asked for. */
export function useBridgeMatrix(household: Household, assumptions: Assumptions, levers: BridgeLevers): Answer<BridgeMatrix> {
  return useOffThread<BridgeRequest, BridgeMessage, BridgeMatrix>(
    { household, assumptions, levers, what: 'matrix' },
    makeWorker,
    () => bridgeMatrix(household, assumptions, levers),
    (m) => (m.what === 'matrix' ? m.matrix : null),
  )
}
