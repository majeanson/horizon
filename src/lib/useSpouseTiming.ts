import { spouseTiming, type SpouseTiming } from '../engine/spouseTiming.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DecideMessage, DecideRequest } from './decide.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// « Who should start the QPP first? », off the page's thread (lib/useOffThread.ts, in the « Décider » worker). The answer wraps the grid so that « not a couple » (null) is told apart from « not in yet ».

export type SpouseTimingAnswer = { timing: SpouseTiming | null }

export function useSpouseTiming(household: Household, assumptions: Assumptions, enabled: boolean): Answer<SpouseTimingAnswer> {
  const answer = useOffThread<DecideRequest, DecideMessage, SpouseTimingAnswer>(
    { what: 'timing', household, assumptions },
    () => new Worker(new URL('./decide.worker.ts', import.meta.url), { type: 'module' }),
    () => ({ timing: spouseTiming(household, assumptions) }),
    (m) => (m.what === 'timing' ? m.answer : null),
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
