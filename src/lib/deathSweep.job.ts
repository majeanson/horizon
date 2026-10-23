import type { BridgeLevers } from '../engine/bridge.ts'
import { deathSweep, type DeathSweep } from '../engine/deathSweep.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// Off the page's thread: every way of starting, once for each age a life might end at — thirty projections. Nothing here touches the network or storage.

export interface DeathSweepRequest {
  household: Household
  assumptions: Assumptions
  levers: BridgeLevers
}

self.onmessage = (event: MessageEvent<DeathSweepRequest>) => {
  const { household, assumptions, levers } = event.data
  self.postMessage(deathSweep(household, assumptions, levers) satisfies DeathSweep)
}
