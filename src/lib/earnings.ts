import { rrqPension, type RrqRules } from '../engine/rrq.ts'
import type { Person } from '../engine/types.ts'

// Two helpers around a person's pensionable earnings: filling the years they have not typed, and the check
// that sets Horizon's own RRQ figure beside the one printed on their relevé.

/** The age a first job is assumed to start when a history is filled in — an estimate, said to be one. */
export const ASSUMED_FIRST_JOB_AGE = 22

/** The calendar years a person's history could hold, from the RRQ's first year (1966) or age 18, to `lastYear`. */
export function historyYears(person: Person, lastYear: number): number[] {
  const first = Math.max(1966, person.birth.year + 18)
  return Array.from({ length: Math.max(0, lastYear - first + 1) }, (_, i) => first + i)
}

/**
 * Estimates the years the person has NOT typed from today's salary: each past year's pay is today's pay
 * deflated by the wage growth, never above that year's maximum pensionable earnings, starting at
 * ASSUMED_FIRST_JOB_AGE. Years already typed are never touched — the relevé's own figure always wins.
 */
export function fillFromSalary(
  person: Person,
  today: { year: number },
  wageGrowth: number,
  mgaAt: (year: number) => number,
): Record<number, number> {
  const filled: Record<number, number> = { ...person.earningsHistory }
  if (person.salaryToday <= 0) return filled
  const firstJobYear = person.birth.year + ASSUMED_FIRST_JOB_AGE
  for (const year of historyYears(person, today.year - 1)) {
    if (year < firstJobYear || year in filled) continue
    const pay = person.salaryToday / (1 + wageGrowth) ** (today.year - year)
    filled[year] = Math.round(Math.min(pay, mgaAt(year)))
  }
  return filled
}

/**
 * Horizon's own estimate of the person's monthly RRQ pension if it started at `startAge`, built the way the
 * relevé builds its « Montant projeté »: the typed history, then today's salary held level (capped at each
 * year's maximum) for every year until the pension starts — whatever the person's own retirement plan says, since
 * the relevé does not know it. A CHECK to set beside the relevé's figure, never an input to the projection.
 */
export function rrqEstimate(person: Person, today: { year: number }, startAge: number, rules: RrqRules): number {
  const earnings: Record<number, number> = { ...person.earningsHistory }
  const lastYearBefore = person.birth.year + startAge - 1
  for (let year = today.year; year <= lastYearBefore; year++) earnings[year] = Math.min(person.salaryToday, rules.mga(year))
  return rrqPension({ birth: person.birth, earnings, startAge }, rules).monthly
}
