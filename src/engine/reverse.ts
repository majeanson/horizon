import { maxRetiredSpending } from './maxSpending.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import { savingsNeeded } from './savingsNeeded.ts'
import type { Assumptions, Household } from './types.ts'

// « I WANT TO STOP AT X. WHAT HAS TO BE TRUE? » — the plan asked the other way round. The usual question fixes the plan and finds the age; here the age is fixed and each
// way of changing the plan is turned into the amount it would take, in its own unit, so a household can see which one it can live with:
//   · spend less in retirement  → the most a year can be (`maxRetiredSpending`, engine/maxSpending.ts);
//   · save more while working   → the yearly amount moved from spending into saving (`savingsNeeded`, engine/savingsNeeded.ts);
//   · work longer               → the earliest age that works as the plan stands (`retireAt`);
//   · earn more on the money    → the points a year the three returns would each have to gain (a search here): « what would I have to believe? ».
// The levers are NOT added together and NOT ranked against each other: a dollar less spending and a point more of return are not the same kind of pain, and any exchange rate
// between them would be this file's opinion. Each is the whole change on its own, found by the same plain « no year short » test as everything else. Pure.

/** The most the three returns are asked to rise by, in a year (0,05 = five points). Past it the answer is « not by returns alone ». */
export const MAX_EXTRA_RETURN = 0.05
/** The step the needed rise is rounded UP to (a tenth of a point), so the amount shown always works. */
export const RETURN_STEP = 0.001

export interface ReverseTarget {
  /** The age everyone is asked to stop at. */
  age: number
  /** Whether the plan, as it stands, already works at that age. */
  works: boolean
  /** The retired spending in the profile and the most it could be, in today's dollars a year (`max`: null when not even 0 works at that age). */
  spend: { current: number; max: number | null }
  /** The extra yearly saving while working, in today's dollars: 0 when it already works, null when no amount does (see `savingsNeeded`). */
  save: number | null
  /** The earliest age that works as the plan stands (null: none up to 70). */
  earliest: number | null
  /** The points a year each return would have to gain (0,012 = 1,2 points): 0 when it already works, null when even `MAX_EXTRA_RETURN` does not. */
  returns: number | null
}

/** The assumptions with every account earning `extra` more a year. */
export function withExtraReturn(a: Assumptions, extra: number): Assumptions {
  return { ...a, returns: { nonReg: a.returns.nonReg + extra, rrsp: a.returns.rrsp + extra, tfsa: a.returns.tfsa + extra } }
}

/** The smallest rise in the returns (rounded up to `RETURN_STEP`) for which stopping at `age` works; 0 if it already does, null if `MAX_EXTRA_RETURN` is not enough. */
export function requiredReturn(h: Household, a: Assumptions, age: number): number | null {
  const works = (extra: number) => runScenario(h, withExtraReturn(a, extra), everyoneAt(h, age), age).ok
  if (works(0)) return 0
  if (!works(MAX_EXTRA_RETURN)) return null
  let lo = 0
  let hi = MAX_EXTRA_RETURN
  // More return can only help, so the first age that works is found by bisection; the loop ends within a hundredth of a step of it.
  while (hi - lo > RETURN_STEP / 10) {
    const mid = (lo + hi) / 2
    if (works(mid)) hi = mid
    else lo = mid
  }
  const rounded = Math.ceil(hi / RETURN_STEP - 1e-9) * RETURN_STEP
  return Math.min(MAX_EXTRA_RETURN, rounded)
}

export function reverseTarget(h: Household, a: Assumptions, age: number): ReverseTarget {
  const works = runScenario(h, a, everyoneAt(h, age), age).ok
  return {
    age,
    works,
    spend: { current: h.spending.retiredToday, max: maxRetiredSpending(h, a, age) },
    save: savingsNeeded(h, a, age).extraPerYear,
    earliest: retireAt(h, a, { stopAtFirstOk: true }).earliestOk,
    returns: requiredReturn(h, a, age),
  }
}
