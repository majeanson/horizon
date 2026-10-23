import { bridgeMatrix, bridgeView, type BridgeLevers, type BridgeView, type MatrixCell, type StrategyKey } from '../engine/bridge.ts'
import type { PresetKey } from '../engine/assumptionPresets.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « Mes années 60 à 70 » is six projections for one look (the plan and the five strategies) and fifteen more when the
// person asks how each strategy fares under the prudent, neutral and bold sets — about half a second to several, for a
// couple. It runs here, off the page's thread, and answers once. Nothing here touches the network or storage: it
// receives a household, assumptions and the levers, and answers with numbers.

export type BridgeMatrix = Record<StrategyKey, Record<PresetKey, MatrixCell>>

export interface BridgeRequest {
  household: Household
  assumptions: Assumptions
  levers: BridgeLevers
  /** `view`: the plan and the five strategies. `matrix`: the fifteen runs under three sets of assumptions. */
  what: 'view' | 'matrix'
}

export type BridgeMessage = { what: 'view'; view: BridgeView } | { what: 'matrix'; matrix: BridgeMatrix }

self.onmessage = (event: MessageEvent<BridgeRequest>) => {
  const { household, assumptions, levers, what } = event.data
  self.postMessage((what === 'view' ? { what, view: bridgeView(household, assumptions, levers) } : { what, matrix: bridgeMatrix(household, assumptions, levers) }) satisfies BridgeMessage)
}
