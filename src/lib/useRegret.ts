import { regretAnswer, type RegretAnswer } from '../engine/regret.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { RegretMessage, RegretRequest } from './regret.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « What does one more year of work buy? », off the page's thread (lib/useOffThread.ts). It does not depend on the age being tried, so moving the age re-asks nothing.

export function useRegret(household: Household, assumptions: Assumptions, enabled: boolean): Answer<RegretAnswer> {
  const answer = useOffThread<RegretRequest, RegretMessage, RegretAnswer>(
    { household, assumptions },
    () => new Worker(new URL('./regret.worker.ts', import.meta.url), { type: 'module' }),
    () => regretAnswer(household, assumptions),
    (m) => m.answer,
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
