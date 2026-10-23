import { CHANGES, applies } from './levers.ts'
import { planGlance, type PlanGlance } from './ledger.ts'
import type { Assumptions, Flow, Household } from './types.ts'

// « HOW CAN THE MONEY LAST LONGER? » — the questions of a household that has ALREADY stopped working. For everyone else the answer is an age (retireAt, levers.ts): which changes let
// them stop sooner. For a retiree that question is closed, and the ones left are: does the money last, until when, how much could be spent and still last, and which change helps most.
//
// Everything here reads the plan AS THE HOUSEHOLD ENTERED IT (each person at their own retirement age) — never « everyone retires at X » (`everyoneAt`), which for someone who stopped
// years ago answers a hypothetical (maxRetiredSpending asks it at the headline's age, so for a couple who stopped at 62 it computes as if they kept working to 64). A change is judged by
// the plan's own verdict (planGlance: does it last, the first short year, what is left at the end in today's dollars), the way a slider's live impact is.

export const RETIREE_LEVER_IDS = ['spend10', 'spend20', 'income', 'pensions70'] as const
export type RetireeLeverId = (typeof RETIREE_LEVER_IDS)[number]

/** A side income of this much a year (today's dollars) for this many years, taxed like any other income: a few part-time years in retirement. */
export const SIDE_INCOME = { perYear: 10_000, years: 5 } as const

export interface RetireeLever extends PlanGlance {
  id: RetireeLeverId
  /** What the change adds to the money left at the end of the plan, today's dollars (negative: less). */
  endGain: number
}

/** Retired spending 20 % lower. (The 10 % one is levers.ts's.) */
const spend20 = (h: Household, a: Assumptions): [Household, Assumptions] => [{ ...h, spending: { ...h.spending, retiredToday: h.spending.retiredToday * 0.8 } }, a]

/** A part-time income for a few years from this year, to the first person alive (a dated flow, like any other). */
const income = (h: Household, a: Assumptions): [Household, Assumptions] => {
  const flow: Flow = {
    label: 'Side income',
    kind: 'income',
    amount: SIDE_INCOME.perYear,
    fromYear: a.today.year,
    toYear: a.today.year + SIDE_INCOME.years - 1,
    owner: h.persons[0].id,
    taxable: true,
  }
  return [{ ...h, flows: [...(h.flows ?? []), flow] }, a]
}

const CHANGE: Record<RetireeLeverId, (h: Household, a: Assumptions) => [Household, Assumptions]> = { spend10: CHANGES.spend10, spend20, income, pensions70: CHANGES.pensions70 }

/** A lever that cannot change anything for this household (every pension already started, or at 70) is not offered. */
const offered = (id: RetireeLeverId, h: Household, a: Assumptions): boolean => (id === 'pensions70' ? applies('pensions70', h, a) : true)

/**
 * How much better a plan is: one that lasts beats one that does not; among those that run short, the later the first short year the better; then the more money at the end.
 * A positive number: `a` is better than `b`.
 */
export function betterBy(a: PlanGlance, b: PlanGlance): number {
  if (a.ok !== b.ok) return a.ok ? 1 : -1
  if (!a.ok && !b.ok && a.firstShortfallYear !== b.firstShortfallYear) return (a.firstShortfallYear ?? 0) - (b.firstShortfallYear ?? 0)
  return a.netWorthEnd - b.netWorthEnd
}

/** The plan as it stands, and each change tried alone, best first. */
export function retireeLevers(h: Household, a: Assumptions): { base: PlanGlance; levers: RetireeLever[] } {
  const base = planGlance(h, a)
  const levers = RETIREE_LEVER_IDS.filter((id) => offered(id, h, a)).map((id): RetireeLever => {
    const [hh, aa] = CHANGE[id](h, a)
    const g = planGlance(hh, aa)
    return { id, ...g, endGain: g.netWorthEnd - base.netWorthEnd }
  })
  return { base, levers: levers.sort((x, y) => betterBy(y, x)) }
}

/**
 * The most a year of retired spending can be (today's dollars, rounded down to `step`) for the plan as entered to last to the end; null when not even nothing lasts.
 * Spending is a need met before anything is saved, so more spending can only make a year shorter: found by bisection.
 */
export function maxOwnRetiredSpending(h: Household, a: Assumptions, step = 100): number | null {
  const lasts = (retiredToday: number) => planGlance({ ...h, spending: { ...h.spending, retiredToday } }, a).ok
  if (!lasts(0)) return null
  let lo = 0
  let hi = Math.max(60_000, h.spending.retiredToday * 2)
  while (lasts(hi) && hi < 5_000_000) {
    lo = hi
    hi *= 2
  }
  for (let i = 0; i < 24 && hi - lo > step / 2; i++) {
    const mid = (lo + hi) / 2
    if (lasts(mid)) lo = mid
    else hi = mid
  }
  return Math.floor(lo / step) * step
}
