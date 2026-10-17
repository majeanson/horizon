import type { Household } from '../engine/types.ts'

// « Les chiffres de ce plan » — the sources page cut down to the government figures that APPLY to this household. A figure is left out only for a reason the household's own profile
// states, and the page says which families it left out and how many rows that is: it is a shorter list with its omissions named, never a claim that every other row is read by
// some step of the calculation. The full list stays one choice away (« Les sources »).

export type Family = 'children' | 'survivor' | 'couple' | 'alone' | 'work'

interface Facts {
  household: Household
  /** Everyone has stopped working already: no payroll figure is read from now on. */
  retiredNow: boolean
}

/** The family a figure belongs to when it applies to some households only, or null when every household reads it. */
export function familyOf(path: string): Family | null {
  if (/^(childBenefits|parentalLeave|kids)\./.test(path)) return 'children'
  if (/^(rrq\.survivor|oas\.survivor|rrq\.deathBenefit)/.test(path)) return 'survivor'
  if (path === 'quebec.livingAloneAmount') return 'alone'
  if (/^oas\.gis\.(spouseOas|spouseNone|topUpStartCouple|baseDivisorCouple|topUpDivisorCouple)/.test(path)) return 'couple'
  if (path.startsWith('payroll.')) return 'work'
  return null
}

/** Whether the household's own profile says this family is part of its plan. */
export function familyApplies(f: Family, { household, retiredNow }: Facts): boolean {
  const couple = household.persons.length > 1
  switch (f) {
    case 'children':
      return (household.children?.length ?? 0) > 0 || household.kidsEffects != null
    case 'survivor':
      return couple
    case 'couple':
      return couple
    case 'alone':
      return !couple && household.livesAlone !== false
    case 'work':
      return !retiredNow
  }
}

/** The rows that apply to this household, and the families that were left out (each once) with the number of rows it took. */
export function figuresUsed<T extends { path: string }>(rows: readonly T[], facts: Facts): { kept: T[]; left: { family: Family; count: number }[] } {
  const kept: T[] = []
  const counts = new Map<Family, number>()
  for (const row of rows) {
    const family = familyOf(row.path)
    if (family === null || familyApplies(family, facts)) kept.push(row)
    else counts.set(family, (counts.get(family) ?? 0) + 1)
  }
  return { kept, left: [...counts].map(([family, count]) => ({ family, count })) }
}
