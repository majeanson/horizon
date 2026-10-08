import { withdrawalOrders, type WithdrawalOrders } from '../engine/withdrawalOrders.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { WithdrawalOrdersMessage, WithdrawalOrdersRequest } from './withdrawalOrders.worker.ts'
import { useOffThread, type Answer } from './useOffThread.ts'

// The six orders of drawing the accounts, computed off the page's thread (lib/useOffThread.ts), started behind the verdict
// and the chart ('idle'): the answer sits low on the page. The last answer stays up (`busy`) while a changed profile recomputes.

export function useWithdrawalOrders(household: Household, assumptions: Assumptions, age: number, firstAge: number): Answer<WithdrawalOrders> {
  return useOffThread<WithdrawalOrdersRequest, WithdrawalOrdersMessage, WithdrawalOrders>(
    { household, assumptions, age, firstAge },
    () => new Worker(new URL('./withdrawalOrders.worker.ts', import.meta.url), { type: 'module' }),
    () => withdrawalOrders(household, assumptions, age, firstAge),
    (m) => m.answer,
    true,
    'idle',
  )
}
