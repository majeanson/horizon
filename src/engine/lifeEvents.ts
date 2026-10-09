import type { Assumptions, Household, PersonId } from './types.ts'

// WHAT A LIFE ADDS TO THE BUDGET: the children who leave, the spending that slows with age, and the dated flows (an inheritance, a roof, rent,
// a care reserve). Each is a pure function of the household, the assumptions and a calendar year, in TODAY's dollars — the projection grows
// them with prices and puts them where they belong (the need, the tax, the accounts). A household that states none of them gets 0 and 1, so
// every plan written before these existed projects exactly as it did.

/** The oldest age the retired spending is held level to; after it, `retiredSpendingDrift` a year. */
export const DRIFT_FROM_AGE = 70

/** The children who count as part of today's budget: the ones still under the leaving age now. */
const inTheBudget = (h: Household, today: number, untilAge: number): number[] => (h.children ?? []).filter((born) => today - born < untilAge)

/**
 * What the working-years budget drops by in `year`, once children have left home: `perChild` for each child who is in the budget today and has
 * reached the leaving age by then. 0 when the household states no such cost.
 */
export function childStepDown(h: Household, a: Assumptions, year: number): number {
  const c = h.childSpending
  if (!c || c.perChild <= 0) return 0
  const gone = inTheBudget(h, a.today.year, c.untilAge).filter((born) => year - born >= c.untilAge).length
  return gone * c.perChild
}

/** The factor on the retired budget in a year when the oldest person alive is `oldestAge`: 1 until 70, then `(1 + drift)` for every year past it. */
export function retiredDriftFactor(a: Assumptions, oldestAge: number): number {
  const drift = a.retiredSpendingDrift ?? 0
  return drift === 0 ? 1 : (1 + drift) ** Math.max(0, oldestAge - DRIFT_FROM_AGE)
}

/** The extra spending the dated expenses add in `year` (today's dollars). */
export function flowExpenses(h: Household, year: number): number {
  return (h.flows ?? []).reduce((s, f) => (f.kind === 'expense' && year >= f.fromYear && year <= f.toYear ? s + f.amount : s), 0)
}

/** The windfalls received in `year` (today's dollars): once, in the flow's first year. */
export function flowWindfalls(h: Household, year: number): number {
  return (h.flows ?? []).reduce((s, f) => (f.kind === 'windfall' && year === f.fromYear ? s + f.amount : s), 0)
}

/**
 * The dated income of `year`, per person alive (today's dollars): what is taxed as ordinary income and what is not. A flow whose owner is no
 * longer alive goes to the first person who is.
 */
export function flowIncome(h: Household, year: number, alive: readonly PersonId[]): { taxable: number; free: number }[] {
  const out = alive.map(() => ({ taxable: 0, free: 0 }))
  for (const f of h.flows ?? []) {
    if (f.kind !== 'income' || year < f.fromYear || year > f.toYear) continue
    const at = Math.max(0, alive.indexOf(f.owner))
    if (f.taxable) out[at].taxable += f.amount
    else out[at].free += f.amount
  }
  return out
}

/**
 * The pay a person keeps after retiring, in `year`: the `share` of the wage-grown salary for the part of the year after the retirement date, until
 * they reach `untilAge`. `workedShare` is the part of the year already paid as full-time work (1 before the retirement year, the months before
 * the leaving date in it, 0 after). 0 for a person with no such work.
 */
export function partTimePay(partTime: { untilAge: number; share: number } | null | undefined, salary: number, workedShare: number, age: number): number {
  if (!partTime || partTime.share <= 0 || age >= partTime.untilAge) return 0
  return salary * Math.min(1, partTime.share) * (1 - workedShare)
}
