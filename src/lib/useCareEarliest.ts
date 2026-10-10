import type { Assumptions, Household } from '../engine/types.ts'
import type { CareEarliestMessage, CareEarliestRequest } from './careEarliest.worker.ts'
import { careAnswer, type Care, type CareAnswer } from './careModel.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « And if the last years cost more? », computed off the page's thread (lib/useOffThread.ts). The LAST answer stays up while a new
// care recomputes (`busy`), so a slider release never swaps the figures for a skeleton under the reader.

export function useCareEarliest(household: Household, assumptions: Assumptions, care: Care, age: number, enabled: boolean): Answer<CareAnswer> {
  const answer = useOffThread<CareEarliestRequest, CareEarliestMessage, CareAnswer>(
    { household, assumptions, care, age },
    () => new Worker(new URL('./careEarliest.worker.ts', import.meta.url), { type: 'module' }),
    () => careAnswer(household, assumptions, care, age),
    (m) => m,
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
