import type { Assumptions, Household, PersonId } from './types.ts'

// WHAT A LIFE ADDS TO THE BUDGET: the children who leave, the spending that slows with age, and the dated flows (an inheritance, a roof, rent,
// a care reserve). Each is a pure function of the household, the assumptions and a calendar year, in TODAY's dollars — the projection grows
// them with prices and puts them where they belong (the need, the tax, the accounts). A household that states none of them gets 0 and 1, so
// every plan written before these existed projects exactly as it did.

/** The oldest age the retired spending is held level to; after it, `retiredSpendingDrift` a year. */
export const DRIFT_FROM_AGE = 70

/**
 * The age under which a child is a dependant of the family benefits (the Canada Child Benefit and Québec's Allocation famille stop at 18) and of the
 * household-spending survey's own « children » (Statistics Canada's table of household types). It is NOT the age a child leaves home: that is the
 * household's own `childSpending.untilAge`, which can be anything from 16 to 35 — two different questions, kept apart on purpose.
 */
export const DEPENDENT_AGE = 18

/** Where a child stands: still to come (born after this year), at home (born, under the leaving age), or already gone (at or past it). */
export type ChildStage = 'future' | 'home' | 'gone'

export function childStage(born: number, todayYear: number, untilAge: number): ChildStage {
  if (born > todayYear) return 'future'
  return todayYear - born < untilAge ? 'home' : 'gone'
}

/** The children who count as part of today's budget: the ones at home now. A child still to come is NOT in it (its cost is added: `childAdd`). */
const inTheBudget = (h: Household, today: number, untilAge: number): number[] => (h.children ?? []).filter((born) => childStage(born, today, untilAge) === 'home')

/** Which of the four age bands (0–5, 6–12, 13–18, 19 and over) a child's age falls in. */
export const costBandOf = (age: number): 0 | 1 | 2 | 3 => (age < 6 ? 0 : age < 13 ? 1 : age < 19 ? 2 : 3)

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

/**
 * The working-years budget in `year`, in today's dollars: what the household states, less what the children who have left home cost — but never less than
 * what it says it lives on in retirement. The step-down assumes the stated budget held those children; when it did not (two children at 19 300 $ each against a
 * 45 000 $ budget would leave two adults 6 400 $), taking it all out would price the parents' last working years below their own retirement.
 */
export function workingBudget(h: Household, a: Assumptions, year: number): number {
  const stated = h.spending.workingToday
  const floor = Math.min(stated, h.spending.retiredToday)
  return Math.max(floor, stated - childStepDown(h, a, year))
}

/**
 * What the children cost in `year`, in today's dollars, for the picture of where the money goes: the children of today's budget still at home — their `perChild`
 * each, out of the working budget they ride in (never more than that budget: a share cannot exceed its whole) — plus what the children still to come add
 * (`childAdd`). The retirement budget is the adults' own, so a retired household has only the added part. It is an attribution, not a new cost: the projection's
 * spending already holds every dollar of it.
 */
export function childCost(h: Household, a: Assumptions, year: number, retired: boolean): number {
  const c = h.childSpending
  if (!c || c.perChild <= 0) return childAdd(h, a, year)
  const atHome = inTheBudget(h, a.today.year, c.untilAge).filter((born) => year - born < c.untilAge).length
  const inBudget = retired ? 0 : Math.min(atHome * c.perChild, workingBudget(h, a, year))
  return inBudget + childAdd(h, a, year)
}

/**
 * What the children still to come ADD to the budget in `year`, in today's dollars: from its birth until it reaches the leaving age, each costs the amount of its
 * age band (`byAge`) when the household gave one, else the flat `perChild`. A child already at home is in the budget and a child already gone costs
 * nothing, so they add nothing. It applies in the working years AND in retirement: a child still at home when the parents stop working still costs. 0 when
 * the household states no such cost or has no child to come.
 */
export function childAdd(h: Household, a: Assumptions, year: number): number {
  const c = h.childSpending
  if (!c) return 0
  let sum = 0
  for (const born of h.children ?? []) {
    if (childStage(born, a.today.year, c.untilAge) !== 'future') continue
    const age = year - born
    if (age < 0 || age >= c.untilAge) continue
    sum += c.byAge ? c.byAge[costBandOf(age)] : c.perChild
  }
  return sum
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
