import { comparePlans, type PlanAnswer, type PlanQuestion } from './plansCompare.ts'

// Off the page's thread: two searches of a dozen full projections for every kept plan. Nothing here touches the network or storage.

export interface PlansCompareRequest {
  plans: PlanQuestion[]
}

self.onmessage = (event: MessageEvent<PlansCompareRequest>) => {
  self.postMessage(comparePlans(event.data.plans) satisfies PlanAnswer[])
}
