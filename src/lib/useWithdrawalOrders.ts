import { withdrawalOrders, type WithdrawalOrders } from '../engine/withdrawalOrders.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { WithdrawalOrdersMessage, WithdrawalOrdersRequest } from './withdrawalOrders.job.ts'
import { useOffThread, type Answer } from './useOffThread.ts'
import { engineWorker } from './engineWorker.ts'

// The six orders of drawing the accounts, computed off the page's thread (lib/useOffThread.ts), started behind the verdict
// and the chart ('idle'): the answer sits low on the page. `enabled` false asks nothing yet (the answer's one-line pointer waits until it is scrolled into view). The last answer stays up (`busy`) while a changed profile recomputes.

export function useWithdrawalOrders(household: Household, assumptions: Assumptions, age: number, firstAge: number, enabled = true): Answer<WithdrawalOrders> {
  return useOffThread<WithdrawalOrdersRequest, WithdrawalOrdersMessage, WithdrawalOrders>(
    { household, assumptions, age, firstAge },
    () => engineWorker('withdrawalOrders'),
    () => withdrawalOrders(household, assumptions, age, firstAge),
    (m) => m.answer,
    enabled,
    'idle',
  )
}
