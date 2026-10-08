import { leverRanking } from '../engine/levers.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { LeversRequest } from './leversEarliest.worker.ts'
import { useOffThread } from './useOffThread.ts'

export type LeversAnswer = ReturnType<typeof leverRanking>

/** The levers, ranked, or `undefined` while they are being worked out. */
export function useLevers(household: Household, assumptions: Assumptions, enabled: boolean): LeversAnswer | undefined {
  const { value, busy } = useOffThread<LeversRequest, LeversAnswer, LeversAnswer>(
    { household, assumptions },
    () => new Worker(new URL('./leversEarliest.worker.ts', import.meta.url), { type: 'module' }),
    () => leverRanking(household, assumptions),
    (m) => m,
    enabled,
    'idle',
  )
  return busy || value === null ? undefined : value
}
