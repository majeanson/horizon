import type { Assumptions, Household } from '../engine/types.ts'
import type { MarketEarliestRequest } from './marketEarliest.job.ts'
import { marketRange, type MarketRange } from './marketRange.ts'
import { useOffThread } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

/** The earliest age under « lisse » and under each stress path, or `undefined` while it is being worked out. */
export function useMarketRange(household: Household, assumptions: Assumptions, enabled: boolean): MarketRange | undefined {
  const { value, busy } = useOffThread<MarketEarliestRequest, MarketRange, MarketRange>(
    { household, assumptions },
    () => engineWorker('marketEarliest'),
    () => marketRange(household, assumptions),
    (m) => m,
    enabled,
    'idle',
  )
  return busy || value === null ? undefined : value
}
