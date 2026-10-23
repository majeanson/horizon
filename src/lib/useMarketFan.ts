import { fan, type FanLine } from '../engine/fan.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DecideMessage, DecideRequest } from './decide.job.ts'
import { useOffThread, type Answer } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

// « The markets, year by year », off the page's thread (lib/useOffThread.ts, in the « Décider » worker): five projections of the plan, each with its year-end net worth kept.

export type MarketFanAnswer = { lines: FanLine[] }

export function useMarketFan(household: Household, assumptions: Assumptions, enabled: boolean): Answer<MarketFanAnswer> {
  const answer = useOffThread<DecideRequest, DecideMessage, MarketFanAnswer>(
    { what: 'fan', household, assumptions },
    () => engineWorker('decide'),
    () => ({ lines: fan(household, assumptions) }),
    (m) => (m.what === 'fan' ? m.answer : null),
    enabled,
    'idle',
  )
  return enabled ? answer : { value: null, busy: false }
}
