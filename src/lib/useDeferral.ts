import { deferralView, type DeferralView } from '../engine/deferral.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import type { DeferralMessage, DeferralRequest } from './deferral.worker.ts'
import { useOffThread } from './useOffThread.ts'

// The « when should I start my pension? » comparison, computed off the page's thread (lib/useOffThread.ts). `null` while it
// runs — and while a changed profile recomputes — so the page shows a placeholder of the right shape rather than a figure
// for a question nobody asked. It starts when the panel is MOUNTED — the panel sits behind a disclosure, so nobody pays
// for it who does not open it.

export function useDeferral(household: Household, assumptions: Assumptions): DeferralView | null {
  const { value, busy } = useOffThread<DeferralRequest, DeferralMessage, DeferralView>(
    { household, assumptions },
    () => new Worker(new URL('./deferral.worker.ts', import.meta.url), { type: 'module' }),
    () => deferralView(household, assumptions),
    (m) => m.view,
  )
  return busy ? null : value
}
