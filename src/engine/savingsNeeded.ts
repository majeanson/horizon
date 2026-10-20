import { everyoneAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// « How much more should we put aside to retire at X? » — the extra yearly saving, in today's dollars, that makes the
// plan last when everyone retires at `age`, and the account it goes to.
//
// DEFINITION. The extra amount is MOVED from the household's spending while someone works into saving: every working year
// the spending is lower by that amount (in today's dollars, like the spending itself) and the same amount is added to ONE
// kind of account's contribution for the household's earners, split equally between those with a salary and grown with prices
// like every other saving in the profile. Moving it, rather than adding it on top, is what keeps the question honest: the
// projection lets spending outrank savings (a contribution the year's cash cannot cover is cut, non-registered first), and
// a household whose pay is already all spent or saved would otherwise « save » nothing at all.
//
// WHERE IT GOES (2026-10-20, Marc: « pick the best account »). Three placements are tried, and the one that needs the LEAST is
// kept: the RRSP, the TFSA, and a non-registered account. The projection holds a registered contribution to the year's room
// (projection.ts), so what does not fit is cash left over, which it saves TFSA first, then non-registered — « the RRSP » reads
// « the RRSP while there is room, then the TFSA, then non-registered », and « the TFSA » reads « the TFSA, then non-registered ».
// The RRSP's deduction comes back as cash and is saved too. None is assumed best: for a household whose pensions will be topped
// up by the GIS, an RRSP withdrawal is income that lowers the GIS, and the TFSA or a plain account can need less — the search
// decides, household by household. Ties go to the first in the order above. Once one placement has an answer, another is searched
// only if it works at $50 less (one run): it usually does not, so the three cost little more than one.
//
// SEARCH. For each placement, double the amount from $1 000 until the plan works (it cannot exceed the working-years spending),
// then bisect between the last amount that failed and the first that worked, down to TOLERANCE. The answer is rounded UP to
// the next $50 (never above the spending that can be moved) and re-run: the amount shown always works.

const START = 1_000
const TOLERANCE = 25
const STEP = 50

/** Where the extra saving is put first: what the year's room does not take, the projection saves TFSA first, then non-registered. */
export type SavingsAccount = 'rrsp' | 'tfsa' | 'nonReg'

/** The placements tried, in the order a tie keeps. */
export const SAVINGS_ACCOUNTS: readonly SavingsAccount[] = ['rrsp', 'tfsa', 'nonReg']

export interface SavingsNeeded {
  age: number
  /** The yearly amount to move from spending into saving while working, in today's dollars, so the plan works; 0 when it already works; null when even moving all the working-years spending does not (or nobody has a salary to save from). */
  extraPerYear: number | null
  /** Where that amount goes first — the placement that needs the least; null when the amount is 0 or null. */
  account: SavingsAccount | null
}

/** The household with `extra` moved each working year (today's dollars) from spending into `into`, split between the people with a salary. */
export function withExtraSavings(h: Household, extra: number, into: SavingsAccount = 'nonReg'): Household {
  const earners = h.persons.filter((p) => p.salaryToday > 0)
  if (earners.length === 0 || extra <= 0) return h
  const share = extra / earners.length
  return {
    ...h,
    spending: { ...h.spending, workingToday: Math.max(0, h.spending.workingToday - extra) },
    persons: h.persons.map((p) =>
      p.salaryToday > 0 ? { ...p, accounts: { ...p.accounts, [into]: { ...p.accounts[into], annualContribution: p.accounts[into].annualContribution + share } } } : p,
    ),
  }
}

/** The smallest amount, rounded up to $50, that makes `age` work when moved into `into`; null when even the whole working-years spending does not. */
function smallestFor(h: Household, a: Assumptions, age: number, into: SavingsAccount): number | null {
  const works = (extra: number) => runScenario(withExtraSavings(h, extra, into), a, everyoneAt(h, age), age).ok
  // The most that can be moved is all of the working-years spending: if even that is not enough, no amount of saving does it.
  const most = h.spending.workingToday
  if (!works(most)) return null
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
  // Round UP to the next $50, never above what can be moved, and CHECK the rounded figure (the search found `hi` works; the rounding must not be taken on trust).
  let answer = Math.min(Math.ceil(hi / STEP) * STEP, most)
  while (answer < most && !works(answer)) answer = Math.min(answer + STEP, most)
  return answer
}

export function savingsNeeded(h: Household, a: Assumptions, age: number): SavingsNeeded {
  if (runScenario(h, a, everyoneAt(h, age), age).ok) return { age, extraPerYear: 0, account: null }
  if (!h.persons.some((p) => p.salaryToday > 0)) return { age, extraPerYear: null, account: null }
  let best: { extra: number; account: SavingsAccount } | null = null
  for (const account of SAVINGS_ACCOUNTS) {
    // A later placement can only win by working at $50 less than the best so far: one run says whether it is worth a whole search.
    if (best !== null && (best.extra <= STEP || !runScenario(withExtraSavings(h, best.extra - STEP, account), a, everyoneAt(h, age), age).ok)) continue
    const extra = smallestFor(h, a, age, account)
    if (extra !== null && (best === null || extra < best.extra)) best = { extra, account }
  }
  return best === null ? { age, extraPerYear: null, account: null } : { age, extraPerYear: best.extra, account: best.account }
}
