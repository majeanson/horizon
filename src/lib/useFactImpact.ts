import { factSwings } from '../engine/factImpact.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { FactImpactAnswer, FactImpactRequest } from './factImpact.job.ts'
import { useOffThread } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

/** How far the answer moves if each of the given figures were off by 15 %, or `undefined` while it is being worked out. */
export function useFactImpact(household: Household, assumptions: Assumptions, facts: FactImpactRequest['facts'], enabled: boolean): FactImpactAnswer | undefined {
  const { value, busy } = useOffThread<FactImpactRequest, FactImpactAnswer, FactImpactAnswer>(
    { household, assumptions, facts },
    () => engineWorker('factImpact'),
    () => factSwings(household, assumptions, facts),
    (m) => m,
    enabled && facts.length > 0,
    'idle',
  )
  return busy || value === null ? undefined : value
}
