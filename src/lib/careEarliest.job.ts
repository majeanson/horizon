import type { Assumptions, Household } from '../engine/types.ts'
import { careAnswer, type Care, type CareAnswer } from './careModel.ts'

// « And if the last years cost more? » — the plan with a late-life care cost added: the earliest age that works, and what is left at
// the horizon with and without it. A dozen full projections and two more, off the page's thread. Nothing here touches the network
// or storage.

export interface CareEarliestRequest {
  household: Household
  assumptions: Assumptions
  care: Care
  age: number
}

export type CareEarliestMessage = CareAnswer

self.onmessage = (event: MessageEvent<CareEarliestRequest>) => {
  const { household, assumptions, care, age } = event.data
  self.postMessage(careAnswer(household, assumptions, care, age) satisfies CareEarliestMessage)
}
