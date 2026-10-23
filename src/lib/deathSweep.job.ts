import type { BridgeLevers } from '../engine/bridge.ts'
import { deathSweep, type DeathSweep } from '../engine/deathSweep.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { JobPort } from './engineJob.ts'

// Off the page's thread: every way of starting, once for each age a life might end at — thirty projections. Nothing here touches the network or storage.

export interface DeathSweepRequest {
  household: Household
  assumptions: Assumptions
  levers: BridgeLevers
}

export function handle(event: { data: DeathSweepRequest }, self: JobPort): void {
  const { household, assumptions, levers } = event.data
  self.postMessage(deathSweep(household, assumptions, levers) satisfies DeathSweep)
}
