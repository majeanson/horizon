import type { PlanAnswer, PlanQuestion } from './plansCompare.ts'
import { comparePlans } from './plansCompare.ts'
import type { PlansCompareRequest } from './plansCompare.worker.ts'
import { useOffThread } from './useOffThread.ts'

/** Every plan's answer, in the order asked, or `undefined` while they are being worked out. */
export function usePlansCompare(plans: PlanQuestion[], enabled: boolean): PlanAnswer[] | undefined {
  const { value, busy } = useOffThread<PlansCompareRequest, PlanAnswer[], PlanAnswer[]>(
    { plans },
    () => new Worker(new URL('./plansCompare.worker.ts', import.meta.url), { type: 'module' }),
    () => comparePlans(plans),
    (m) => m,
    enabled && plans.length > 0,
    'idle',
  )
  return busy || value === null ? undefined : value
}
