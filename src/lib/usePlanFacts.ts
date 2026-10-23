import { planFactsOf, type PlanFactsRequest, type PlanFactsResult } from './planFacts.ts'
import type { PlanFactsMessage } from './planFacts.job.ts'
import { useOffThread } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

// The facts a plain-language text stands on, off the page's thread: `value` is null until they are in (the card shows a skeleton), then the
// last ones. Asked only while a card is open (`enabled`), because the seventy-odd projections behind them are not worth running for a card nobody opened.
export function usePlanFacts(request: PlanFactsRequest, enabled: boolean, priority: 'now' | 'idle' = 'now'): { value: PlanFactsResult | null; busy: boolean } {
  return useOffThread<PlanFactsRequest, PlanFactsMessage, PlanFactsResult>(
    request,
    () => engineWorker('planFacts'),
    () => planFactsOf(request),
    (m) => m,
    enabled,
    priority,
  )
}
