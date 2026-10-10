import { CHILD_COSTS, CHILD_COST_INCOME_LEVELS, CPI_ANNUAL, type CostBands } from '../engine/params/childCosts.ts'
import { plain } from '../engine/params/cited.ts'
import { childStage, costBandOf } from '../engine/lifeEvents.ts'
import type { Profile } from './schema.ts'

// WHAT A CHILD COSTS THIS HOUSEHOLD — a SUGGESTION, never a figure of the agency's. Statistics Canada says what families like this one spent per child, by the
// child's age band, the family's kind and income level and its number of children (engine/params/childCosts.ts). Which cell a household falls in, and the move
// to today's dollars with the price index, are this app's arithmetic and are said to be an estimate on screen. A suggestion only ever fills what the person
// has not typed: the screen offers it with a button, and a typed figure is never replaced.

/** The default age a child leaves home (the household's own `childSpending.untilAge` replaces it). */
export const DEFAULT_LEAVE_AGE = 23

export type CostLevel = 'lower' | 'medium' | 'higher'

export interface CostSuggestion {
  /** Dollars a year per child at ages 0–5, 6–12, 13–18 and 19 and over, in today's dollars, to the nearest 100 $. */
  bands: [number, number, number, number]
  /** What the same family would spend per child at home TODAY: each child at home, at their own age, averaged (null: none is at home). */
  perChildNow: number | null
  /** The flat figure over a child's whole time at home (0 to the leaving age): what to put on one child when nothing better is known. */
  perChildAverage: number
  family: 'twoParent' | 'oneParent'
  level: CostLevel
  /** How many children the table was read for (1 to 3: the family the child grows up in). */
  children: 1 | 2 | 3
}

/** The price index of the latest year the table carries over that of the study's year (2017): what moves its dollars to today's. */
export function costFactor(): number {
  const cpi = plain(CPI_ANNUAL)
  const latest = Math.max(...Object.keys(cpi).map(Number))
  return cpi[latest] / cpi[2017]
}

/** The paper's income levels (2016 dollars) moved to today with the price index. */
function levelsToday(): { lowerBelow: number; higherAbove: number } {
  const cpi = plain(CPI_ANNUAL)
  const latest = Math.max(...Object.keys(cpi).map(Number))
  const move = cpi[latest] / cpi[2016]
  const { lowerBelow, higherAbove } = plain(CHILD_COST_INCOME_LEVELS)
  return { lowerBelow: lowerBelow * move, higherAbove: higherAbove * move }
}

const round100 = (n: number) => Math.round(n / 100) * 100

/** The household's earnings today, before tax: the income the table's levels are read against. */
export const householdIncome = (p: Profile): number => p.household.persons.reduce((s, x) => s + x.salaryToday, 0)

export function costLevel(income: number): CostLevel {
  const t = levelsToday()
  return income < t.lowerBelow ? 'lower' : income > t.higherAbove ? 'higher' : 'medium'
}

/** What a household like this one spends per child, or null when it has no one to ask it of (no persons). */
export function suggestChildCost(p: Profile, todayYear: number): CostSuggestion | null {
  const h = p.household
  if (h.persons.length === 0) return null
  const untilAge = h.childSpending?.untilAge ?? DEFAULT_LEAVE_AGE
  const born = h.children ?? []
  // The family the child grows up in: the children at home or still to come (a grown child no longer lives there), at least this one, at most three.
  const counted = born.filter((y) => childStage(y, todayYear, untilAge) !== 'gone').length
  const children = Math.min(3, Math.max(1, counted)) as 1 | 2 | 3
  const family = h.persons.length === 1 ? 'oneParent' : 'twoParent'
  const level = costLevel(householdIncome(p))
  const table = plain(CHILD_COSTS)[children === 1 ? 'oneChild' : children === 2 ? 'twoChildren' : 'threeChildren']
  let cell: CostBands
  if (family === 'twoParent') cell = table.twoParent[level]
  else cell = level === 'lower' ? table.oneParent.lower : table.oneParent.mediumHigh
  const factor = costFactor()
  const bands = cell.map((b) => round100(b * factor)) as CostSuggestion['bands']

  // Each child at home, at their own age today; the average over the years a child spends at home.
  const atHome = born.filter((y) => childStage(y, todayYear, untilAge) === 'home')
  const perChildNow = atHome.length === 0 ? null : round100(atHome.reduce((s, y) => s + cell[costBandOf(todayYear - y)] * factor, 0) / atHome.length)
  let sum = 0
  for (let age = 0; age < untilAge; age++) sum += cell[costBandOf(age)] * factor
  return { bands, perChildNow, perChildAverage: round100(sum / untilAge), family, level, children }
}
