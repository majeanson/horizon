import { takeHome } from '../engine/takeHome.ts'
import type { Person } from '../engine/types.ts'

// The net pay a person typed, beside what the salary leaves (engine/takeHome.ts): the same thing within a couple of percent, or the gap. A gap above is what is withheld at
// the source on top of tax, QPP, EI and QPIP (a pension plan, an RRSP through payroll, insurance) — money the plan does not see leaving the pay. A CHECK, never an input.

/** How close, as a share of what the salary leaves, the two must be to be called the same: pay stubs round and bonuses come and go. */
export const SAME_WITHIN = 0.02

export interface NetPayCheck {
  /** What the salary leaves in a year, by the calculation. */
  expected: number
  /** The year's net pay as the person typed it. */
  typed: number
  /** The calculation less the person's figure: positive when more is withheld than the calculation knows. */
  gap: number
  kind: 'same' | 'fewer' | 'more'
}

/** The check for one person, or null while there is no net pay typed or no salary to compare it with. */
export function netPayCheck(person: Person, assumptions: { inflation: number; wageGrowth: number }, livesAlone: boolean, todayYear: number): NetPayCheck | null {
  const typed = person.netPayYearly
  if (typed === undefined || !(typed > 0) || !(person.salaryToday > 0)) return null
  const expected = takeHome(person.salaryToday, todayYear - person.birth.year, todayYear, assumptions, livesAlone)
  const gap = expected - typed
  return { expected, typed, gap, kind: Math.abs(gap) <= SAME_WITHIN * expected ? 'same' : gap > 0 ? 'fewer' : 'more' }
}
