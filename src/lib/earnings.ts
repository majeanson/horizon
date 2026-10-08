import type { Person } from '../engine/types.ts'

// Helpers around a person's pensionable earnings: filling the years they have not typed in.

/**
 * The most a year's earnings count for on the relevé: the additional ceiling from 2024 (the second additional plan counts pay
 * up to it — 81 200 $ for 2025), the plain maximum (the MGA) before. A salary above it appears AT it: the QPP does not read the rest.
 */
export const earningsCeiling = (rules: { mga: (year: number) => number; yampe: (year: number) => number | null }) => (year: number): number => rules.yampe(year) ?? rules.mga(year)

/** The age a first job is assumed to start when a history is filled in — an estimate, said to be one. */
export const ASSUMED_FIRST_JOB_AGE = 22

/** The calendar years a person's history could hold, from the RRQ's first year (1966) or age 18, to `lastYear`. */
export function historyYears(person: Person, lastYear: number): number[] {
  const first = Math.max(1966, person.birth.year + 18)
  return Array.from({ length: Math.max(0, lastYear - first + 1) }, (_, i) => first + i)
}

/**
 * Estimates the years the person has NOT typed from today's salary: each past year's pay is today's pay
 * deflated by the wage growth, never above that year's ceiling (`earningsCeiling`), starting at
 * ASSUMED_FIRST_JOB_AGE. Years already typed are never touched — the relevé's own figure always wins.
 */
export function fillFromSalary(
  person: Person,
  today: { year: number },
  wageGrowth: number,
  ceilingAt: (year: number) => number,
): Record<number, number> {
  const filled: Record<number, number> = { ...person.earningsHistory }
  if (person.salaryToday <= 0) return filled
  const firstJobYear = person.birth.year + ASSUMED_FIRST_JOB_AGE
  for (const year of historyYears(person, today.year - 1)) {
    if (year < firstJobYear || year in filled) continue
    const pay = person.salaryToday / (1 + wageGrowth) ** (today.year - year)
    filled[year] = Math.round(Math.min(pay, ceilingAt(year)))
  }
  return filled
}

