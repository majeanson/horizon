import { leverRanking } from '../engine/levers.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// Off the page's thread: five searches of a dozen full projections each. Nothing here touches the network or storage.

export interface LeversRequest {
  household: Household
  assumptions: Assumptions
}

self.onmessage = (event: MessageEvent<LeversRequest>) => {
  const { household, assumptions } = event.data
  self.postMessage(leverRanking(household, assumptions))
}
