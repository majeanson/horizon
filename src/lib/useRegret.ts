import { regretAnswer, type RegretAnswer } from '../engine/regret.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DecideMessage, DecideRequest } from './decide.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « What does one more year of work buy? », off the page's thread (lib/useOffThread.ts, in the « Décider » worker). It does not depend on the age being tried, so moving the age re-asks nothing.

export function useRegret(household: Household, assumptions: Assumptions, enabled: boolean): Answer<RegretAnswer> {
  const answer = useOffThread<DecideRequest, DecideMessage, RegretAnswer>(
    { what: 'regret', household, assumptions },
    () => new Worker(new URL('./decide.worker.ts', import.meta.url), { type: 'module' }),
    () => regretAnswer(household, assumptions),
    (m) => (m.what === 'regret' ? m.answer : null),
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
