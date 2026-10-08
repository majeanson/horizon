import type { Assumptions, Household } from '../engine/types.ts'
import { spendEarliest } from './spendModel.ts'

// « And if we spent less in retirement? » — the earliest age that works once the retired spending is `retiredToday`
// (today's dollars): one search of a dozen full projections, off the page's thread. Nothing here touches the network
// or storage.

export interface SpendEarliestRequest {
  household: Household
  assumptions: Assumptions
  retiredToday: number
}

export type SpendEarliestMessage = { earliest: number | null }

self.onmessage = (event: MessageEvent<SpendEarliestRequest>) => {
  const { household, assumptions, retiredToday } = event.data
  self.postMessage({ earliest: spendEarliest(household, assumptions, retiredToday) } satisfies SpendEarliestMessage)
}
