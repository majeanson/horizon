import { everyoneAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// « How much more should we put aside to retire at X? » — the extra yearly saving, in today's dollars, that makes the
// plan last when everyone retires at `age`.
//
// DEFINITION. The extra amount is MOVED from the household's spending while someone works into saving: every working year
// the spending is lower by that amount (in today's dollars, like the spending itself) and the same amount is added to the
// NON-REGISTERED contribution of the household's earners, split equally between those with a salary and grown with prices
// like every other saving in the profile. Moving it, rather than adding it on top, is what keeps the question honest: the
// projection lets spending outrank savings (a contribution the year's cash cannot cover is cut, non-registered first), and
// a household whose pay is already all spent or saved would otherwise « save » nothing at all. A non-registered account is
// used because it has no contribution room to run out of; a registered account would do a little better (a deduction,
// tax-free growth), so the figure is a slightly cautious one. With the amount moved, more saving can only help, which is
// what lets us search for the smallest amount that works.
//
// SEARCH. Double the amount from $1 000 until the plan works (it cannot exceed the working-years spending), then bisect between the
// last amount that failed and the first that worked, down to TOLERANCE. The answer is rounded UP to the next $50: the
// amount shown always works.

const START = 1_000
const TOLERANCE = 25
const STEP = 50

export interface SavingsNeeded {
  age: number
  /** The yearly amount to move from spending into saving while working, in today's dollars, so the plan works; 0 when it already works; null when even moving all the working-years spending does not (or nobody has a salary to save from). */
  extraPerYear: number | null
}

/** The household with `extra` moved each working year (today's dollars) from spending to saving, split between the people with a salary. */
export function withExtraSavings(h: Household, extra: number): Household {
  const earners = h.persons.filter((p) => p.salaryToday > 0)
  if (earners.length === 0 || extra <= 0) return h
  const share = extra / earners.length
  return {
    ...h,
    spending: { ...h.spending, workingToday: Math.max(0, h.spending.workingToday - extra) },
    persons: h.persons.map((p) =>
      p.salaryToday > 0 ? { ...p, accounts: { ...p.accounts, nonReg: { ...p.accounts.nonReg, annualContribution: p.accounts.nonReg.annualContribution + share } } } : p,
    ),
  }
}

export function savingsNeeded(h: Household, a: Assumptions, age: number): SavingsNeeded {
  const works = (extra: number) => runScenario(withExtraSavings(h, extra), a, everyoneAt(h, age), age).ok
  if (works(0)) return { age, extraPerYear: 0 }
  if (!h.persons.some((p) => p.salaryToday > 0)) return { age, extraPerYear: null }
  // The most that can be moved is all of the working-years spending: if even that is not enough, no amount of saving does it.
  const most = h.spending.workingToday
  if (!works(most)) return { age, extraPerYear: null }
  let lo = 0
  let hi = Math.min(START, most)
  while (hi < most && !works(hi)) {
    lo = hi
    hi = Math.min(hi * 2, most)
  }
  while (hi - lo > TOLERANCE) {
    const mid = (lo + hi) / 2
    if (works(mid)) hi = mid
    else lo = mid
  }
  return { age, extraPerYear: Math.ceil(hi / STEP) * STEP }
}
