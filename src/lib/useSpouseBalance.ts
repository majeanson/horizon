import { spouseBalance } from '../engine/spouseBalance.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { SpouseBalanceAnswer, SpouseBalanceMessage, SpouseBalanceRequest } from './spouseBalance.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// What evening out the two spouses' RRSPs would save, computed off the page's thread (lib/useOffThread.ts), started behind the verdict
// and the chart ('idle'). `enabled` false asks nothing yet (the answer's one-line pointer waits until it is scrolled into view).
// The value is boxed: `balance` null is an answer too (a one-person household, or no RRSP), not a computation still running.

export function useSpouseBalance(household: Household, assumptions: Assumptions, age: number, firstAge: number, enabled = true): Answer<SpouseBalanceAnswer> {
  return useOffThread<SpouseBalanceRequest, SpouseBalanceMessage, SpouseBalanceAnswer>(
    { household, assumptions, age, firstAge },
    () => new Worker(new URL('./spouseBalance.worker.ts', import.meta.url), { type: 'module' }),
    () => ({ balance: spouseBalance(household, assumptions, age, firstAge) }),
    (m) => m.answer,
    // A one-person household has nothing to even out: no worker at all.
    enabled && household.persons.length > 1,
    'idle',
  )
}
