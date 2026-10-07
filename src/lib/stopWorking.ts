import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « When can I stop working? » — what the answer means in dates. The earliest age that works is not enough to plan a
// life around; this adds the calendar year each person reaches it, and the year from which the household's guaranteed
// income (QPP, OAS, GIS, a plan pension) covers its spending on its own — before that, it lives off its savings.

export interface StopWorking {
  /** For each person, the year they turn the age (in profile order). */
  years: { id: string; year: number }[]
  /** The first year, once everyone has stopped, in which the pensions alone (QPP + OAS + GIS + plan pension) cover the year's spending; null if that never happens before the horizon. */
  pensionsCoverFrom: number | null
  /** The year everyone has stopped (the last person's year) and the share of that year's spending the pensions cover by themselves (0 to 1, or more): the rest comes out of savings. */
  firstYear: number
  pensionShare: number
}

export function stopWorking(household: Household, assumptions: Assumptions, age: number): StopWorking {
  const years = household.persons.map((p) => ({ id: p.id, year: p.birth.year + age }))
  const lastStop = Math.max(...years.map((y) => y.year))
  const rows = runScenario(household, assumptions, everyoneAt(household, age), age).rows
  const covers = rows.find((r) => {
    if (r.year < lastStop) return false
    return Object.values(r.persons).reduce((s, p) => s + p.rrq + p.oas + p.gis + p.db, 0) >= r.household.spending
  })
  const first = rows.find((r) => r.year >= lastStop)
  const pensionOf = (r: (typeof rows)[number]) => Object.values(r.persons).reduce((t, p) => t + p.rrq + p.oas + p.gis + p.db, 0)
  return { years, pensionsCoverFrom: covers ? covers.year : null, firstYear: lastStop, pensionShare: first && first.household.spending > 0 ? pensionOf(first) / first.household.spending : 0 }
}
