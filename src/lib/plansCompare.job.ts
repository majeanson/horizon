import { comparePlans, type PlanAnswer, type PlanQuestion } from './plansCompare.ts'
import type { JobPort } from './engineJob.ts'

// Off the page's thread: two searches of a dozen full projections for every kept plan. Nothing here touches the network or storage.

export interface PlansCompareRequest {
  plans: PlanQuestion[]
}

export function handle(event: { data: PlansCompareRequest }, self: JobPort): void {
  self.postMessage(comparePlans(event.data.plans) satisfies PlanAnswer[])
}
