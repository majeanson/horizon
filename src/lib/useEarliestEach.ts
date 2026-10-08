import { earliestEach, type EarliestEach } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { EarliestEachMessage, EarliestEachRequest } from './earliestEach.worker.ts'
import { useOffThread } from './useOffThread.ts'

// The per-person « earliest age » for a couple, computed off the page's thread (lib/useOffThread.ts). `null` while it runs
// (and while a changed profile recomputes), so the page can show a placeholder of the right shape. A household of one
// never asks.

export function useEarliestEach(household: Household, assumptions: Assumptions, enabled: boolean): EarliestEach[] | null {
  const { value, busy } = useOffThread<EarliestEachRequest, EarliestEachMessage, EarliestEach[]>(
    { household, assumptions },
    () => new Worker(new URL('./earliestEach.worker.ts', import.meta.url), { type: 'module' }),
    () => earliestEach(household, assumptions),
    (m) => m.each,
    enabled,
  )
  return enabled && !busy ? value : null
}
