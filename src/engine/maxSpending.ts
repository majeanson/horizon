import { everyoneAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household } from './types.ts'

// « HOW MUCH CAN WE LIVE ON?» — the largest retired spending (today's dollars, a year) for which a retirement at `age` still works: no year of
// the plan short. The same plain definition of « works » as the earliest-age search, turned round: the age is fixed, the spending is the
// unknown. Spending is a need the engine meets before it saves, so more spending can only make a year shorter: the answer is found by bisection.

/** The most a year of retired spending can be for the plan to work at `age`, rounded down to `step` dollars; null when not even 0 works. */
export function maxRetiredSpending(h: Household, a: Assumptions, age: number, step = 100): number | null {
  const works = (retiredToday: number) => runScenario({ ...h, spending: { ...h.spending, retiredToday } }, a, everyoneAt(h, age), age).ok
  if (!works(0)) return null
  let lo = 0
  let hi = Math.max(60_000, h.spending.retiredToday * 2)
  while (works(hi) && hi < 5_000_000) {
    lo = hi
    hi *= 2
  }
  for (let i = 0; i < 24 && hi - lo > step / 2; i++) {
    const mid = (lo + hi) / 2
    if (works(mid)) lo = mid
    else hi = mid
  }
  return Math.floor(lo / step) * step
}
