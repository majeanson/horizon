import type { Assumptions, Household } from '../engine/types.ts'
import { marketRange, type MarketRange } from './marketRange.ts'
import type { JobPort } from './engineJob.ts'

// Off the page's thread: four searches of a dozen full projections each. Nothing here touches the network or storage.

export interface MarketEarliestRequest {
  household: Household
  assumptions: Assumptions
}

export function handle(event: { data: MarketEarliestRequest }, self: JobPort): void {
  const { household, assumptions } = event.data
  self.postMessage(marketRange(household, assumptions) satisfies MarketRange)
}
