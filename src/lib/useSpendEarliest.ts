import type { Assumptions, Household } from '../engine/types.ts'
import type { SpendEarliestMessage, SpendEarliestRequest } from './spendEarliest.worker.ts'
import { spendEarliest } from './spendModel.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « And if we spent `retiredToday` a year in retirement? », computed off the page's thread (lib/useOffThread.ts). The LAST
// answer stays up while a new amount recomputes (`busy`), so a slider release never swaps the age for a skeleton under the
// reader. It starts a beat behind the page's `now` work ('idle'): this answer sits under the verdict and must not race it.
// The answer is boxed (`{ earliest }`): « no age works » is a null the hook must deliver, not a missing value.

export function useSpendEarliest(household: Household, assumptions: Assumptions, retiredToday: number, enabled: boolean): Answer<{ earliest: number | null }> {
  const answer = useOffThread<SpendEarliestRequest, SpendEarliestMessage, { earliest: number | null }>(
    { household, assumptions, retiredToday },
    () => new Worker(new URL('./spendEarliest.worker.ts', import.meta.url), { type: 'module' }),
    () => ({ earliest: spendEarliest(household, assumptions, retiredToday) }),
    (m) => m,
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
