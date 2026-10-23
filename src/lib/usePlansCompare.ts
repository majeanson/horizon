import type { PlanAnswer, PlanQuestion } from './plansCompare.ts'
import { comparePlans } from './plansCompare.ts'
import type { PlansCompareRequest } from './plansCompare.job.ts'
import { useOffThread } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

/** Every plan's answer, in the order asked, or `undefined` while they are being worked out. */
export function usePlansCompare(plans: PlanQuestion[], enabled: boolean): PlanAnswer[] | undefined {
  const { value, busy } = useOffThread<PlansCompareRequest, PlanAnswer[], PlanAnswer[]>(
    { plans },
    () => engineWorker('plansCompare'),
    () => comparePlans(plans),
    (m) => m,
    enabled && plans.length > 0,
    'idle',
  )
  return busy || value === null ? undefined : value
}
