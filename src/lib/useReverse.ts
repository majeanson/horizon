import { reverseTarget, type ReverseTarget } from '../engine/reverse.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { ReverseMessage, ReverseRequest } from './reverse.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « I want to stop at `age`, what has to be true? », off the page's thread (lib/useOffThread.ts). The last answer stays up while a new age recomputes (`busy`), and the first one starts
// a beat behind the page's own work ('idle'): it sits in a fold that opens on request.

export function useReverse(household: Household, assumptions: Assumptions, age: number, enabled: boolean): Answer<ReverseTarget> {
  const answer = useOffThread<ReverseRequest, ReverseMessage, ReverseTarget>(
    { household, assumptions, age },
    () => new Worker(new URL('./reverse.worker.ts', import.meta.url), { type: 'module' }),
    () => reverseTarget(household, assumptions, age),
    (m) => m.answer,
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
