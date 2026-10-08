import { savingsNeeded, type SavingsNeeded } from '../engine/savingsNeeded.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { SavingsNeededMessage, SavingsNeededRequest } from './savingsNeeded.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « How much should I put aside to retire at `age`? », computed off the page's thread (lib/useOffThread.ts). The LAST answer
// stays up while a new age recomputes (`busy`), so an edit never swaps the figure for a skeleton under the reader —
// `value` is null only before the very first answer. It starts a beat behind the page's `now` work ('idle'): this answer sits
// far down the page and must not race the verdict and the chart.

export function useSavingsNeeded(household: Household, assumptions: Assumptions, age: number, enabled: boolean): Answer<SavingsNeeded> {
  const answer = useOffThread<SavingsNeededRequest, SavingsNeededMessage, SavingsNeeded>(
    { household, assumptions, age },
    () => new Worker(new URL('./savingsNeeded.worker.ts', import.meta.url), { type: 'module' }),
    () => savingsNeeded(household, assumptions, age),
    (m) => m.answer,
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
