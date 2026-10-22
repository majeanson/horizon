import { planFactsOf, type PlanFactsRequest, type PlanFactsResult } from './planFacts.ts'

// The facts behind a plain-language text (lib/planFacts.ts says what they are), worked out off the page's thread. Nothing here touches the
// network or storage.

export type PlanFactsMessage = PlanFactsResult

self.onmessage = (event: MessageEvent<PlanFactsRequest>) => {
  self.postMessage(planFactsOf(event.data) satisfies PlanFactsMessage)
}
