import { MIN_TRY_AGE, everyoneAt, retireAt, runScenario } from './retireAt.ts'
import type { AccountKind, Assumptions, Household } from './types.ts'

// « In which order should the accounts be drawn? » — the same plan run once per order of the three accounts (six), so a
// household can see what its choice is worth. Nothing new is modelled: each order is the projection's own
// `withdrawalOrder`, with the withdrawals still solved against the tax function year by year, the RRIF minimum still forced
// out of the RRSP whatever the order, and GIS / OAS recovery still read from the income that results. « RRSP first » is
// therefore the plain form of an RRSP meltdown (the projection does not fill a bracket and stop).
//
// What it does NOT say: the net worth it reports counts what is left in the RRSP at its full value, with the tax it would
// still owe left out — an order that spends the RRSP last looks richer at the horizon than it is. That is why the ranking
// leads with the EARLIEST age that works and the LIFETIME TAX, and shows the worth only as a third column.

export const ALL_ORDERS: readonly (readonly AccountKind[])[] = [
  ['nonReg', 'rrsp', 'tfsa'],
  ['nonReg', 'tfsa', 'rrsp'],
  ['rrsp', 'nonReg', 'tfsa'],
  ['rrsp', 'tfsa', 'nonReg'],
  ['tfsa', 'nonReg', 'rrsp'],
  ['tfsa', 'rrsp', 'nonReg'],
]

export interface OrderOutcome {
  order: readonly AccountKind[]
  /** The earliest whole age at which everyone can stop and the plan lasts under THIS order, or null. */
  earliestOk: number | null
  /** At the asked age: does it last, and when does the money first fall short. */
  ok: boolean
  firstShortfallYear: number | null
  /** Income tax and OAS recovery, summed over the plan, in today's dollars. */
  lifetimeTax: number
  /** Household net worth at the horizon, in today's dollars, RRSP counted before its tax. */
  worthToday: number
}

export interface WithdrawalOrders {
  /** The age every outcome's `ok`, tax and worth were read at. */
  age: number
  outcomes: OrderOutcome[]
  /** Index of the household's own order in `outcomes`. */
  current: number
  /** Index of the order that comes out ahead — the household's own when nothing beats it by a margin. */
  best: number
}

const sameOrder = (a: readonly AccountKind[], b: readonly AccountKind[]) => a.length === b.length && a.every((k, i) => k === b[i])

export function withdrawalOrders(h: Household, a: Assumptions, age: number, firstAge = MIN_TRY_AGE, lastAge = 70): WithdrawalOrders {
  const outcomes: OrderOutcome[] = ALL_ORDERS.map((order) => {
    const withOrder: Assumptions = { ...a, withdrawalOrder: order }
    const earliestOk = retireAt(h, withOrder, { from: firstAge, to: lastAge, stopAtFirstOk: true }).earliestOk
    const run = runScenario(h, withOrder, everyoneAt(h, age), age)
    const real = (year: number) => Math.pow(1 + a.inflation, year - a.today.year)
    let lifetimeTax = 0
    for (const row of run.rows) lifetimeTax += row.household.tax / real(row.year)
    const last = run.rows[run.rows.length - 1]
    return { order, earliestOk, ok: run.ok, firstShortfallYear: run.firstShortfallYear, lifetimeTax, worthToday: run.netWorthAtHorizon / real(last.year) }
  })
  let current = outcomes.findIndex((o) => sameOrder(o.order, a.withdrawalOrder))
  if (current < 0) current = 0
  // Rank: earliest age that works (none = last), then an order that lasts at the asked age, then the lower lifetime tax.
  const rank = (o: OrderOutcome): [number, number, number] => [o.earliestOk ?? Infinity, o.ok ? 0 : 1, o.lifetimeTax]
  const better = (x: OrderOutcome, y: OrderOutcome): boolean => {
    const [a1, b1, c1] = rank(x)
    const [a2, b2, c2] = rank(y)
    if (a1 !== a2) return a1 < a2
    if (b1 !== b2) return b1 < b2
    // Less than 1 % of the tax (or $500) is noise, not a reason to change the household's habit.
    return c1 < c2 - Math.max(500, 0.01 * c2)
  }
  let best = current
  outcomes.forEach((o, i) => {
    if (better(o, outcomes[best])) best = i
  })
  return { age, outcomes, current, best }
}
