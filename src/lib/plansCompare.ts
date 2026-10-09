import { maxRetiredSpending } from '../engine/maxSpending.ts'
import { retireAt, worksNow } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « MES PLANS, CÔTE À CÔTE » — each kept plan (and the one on screen) asked the two questions the results page leads with: the earliest
// age that works, and what that age could fund each month. The same searches as the answer (`retireAt`, `maxRetiredSpending`), so a plan
// here reads exactly as it does when opened. The rows are independent, so the worker answers them in one message.

export interface PlanQuestion {
  name: string
  household: Household
  assumptions: Assumptions
}

export interface PlanAnswer {
  name: string
  /** The earliest age that works (null: none up to 70). */
  earliest: number | null
  /** Stopping today works. */
  nowOk: boolean
  /** The yearly retired spending the earliest age can fund, today's dollars (null: even 0 fails; undefined: no age). */
  comfort: number | null | undefined
}

export function comparePlans(plans: readonly PlanQuestion[]): PlanAnswer[] {
  return plans.map(({ name, household, assumptions }) => {
    const earliest = retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk
    const nowOk = worksNow(household, assumptions, earliest)
    return { name, earliest, nowOk, comfort: earliest === null ? undefined : maxRetiredSpending(household, assumptions, earliest) }
  })
}
