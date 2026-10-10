import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { Assumptions, Household, YearRow } from '../engine/types.ts'

// « When can I stop working? » — what the answer means in dates. The earliest age that works is not enough to plan a
// life around; this adds the calendar year each person reaches it, and the year from which the household's guaranteed
// income (QPP, OAS, GIS, a plan pension), AFTER the tax it pays, covers its spending on its own — before that, it
// lives off its savings. The year the last person stops is a part-pay year, so the first full year of retirement is the
// first year counted. (Before tax, a 70 000 $ pension looked as if it covered 60 000 $ of spending while 15 000 $ went
// to tax and the rest of the year's spending came out of savings.)
//
// The first full year is often BEFORE any pension has begun (retiring at 56, the QPP at 65), or while only one of them
// has (a plan pension at 60, the QPP and the OAS at 65): a share of « 0 % » or « 20 % » read there looked like a bug.
// So the answer also says whether a pension is in pay that year at all, and gives the share again in the first full
// year once EVERY pension has started — the steady state the household will live in for the rest of the plan.

export interface StopWorking {
  /** For each person, the year they turn the age (in profile order). */
  years: { id: string; year: number }[]
  /** The first FULL year of retirement, once everyone has stopped, in which the pensions, after tax, cover the year's spending by themselves; null if that never happens before the horizon. */
  pensionsCoverFrom: number | null
  /** The first full year after the last person stopped, and the share of its spending the pensions cover by themselves, after tax (0 to 1, or more): the rest comes out of savings. */
  firstYear: number
  pensionShare: number
  /** Is any pension (QPP, OAS, GIS, a plan pension) being paid in `firstYear`? When not, the share is 0 because nothing has started, not because the pensions are small. */
  pensionsStarted: boolean
  /** The first full year in which every pension of every person is in pay, and the share it covers then — the plan's steady state. Null when that year is `firstYear` itself (nothing to add) or lies past the horizon. */
  allStarted: { year: number; share: number } | null
}

const pensionsOf = (r: YearRow): number => Object.values(r.persons).reduce((s, p) => s + p.rrq + p.oas + p.gis + p.db, 0)
/** The pensions less the year's tax (income tax and OAS recovery, both spouses). The tax includes any on money drawn from savings, so this is cautious. */
export const pensionsAfterTax = (r: YearRow): number => pensionsOf(r) - r.household.tax

const shareOf = (r: YearRow): number => (r.household.spending > 0 ? Math.max(0, pensionsAfterTax(r)) / r.household.spending : 0)

/** The year the LAST pension of the household begins: each person's QPP, OAS and plan pensions (one already in pay began in the past). */
export function lastPensionStart(household: Household): number {
  return Math.max(...household.persons.map((p) => p.birth.year + Math.max(p.rrq.startAge, p.oas.startAge, ...p.pensions.filter((d) => !d.inPay).map((d) => d.startAge))))
}

export function stopWorking(household: Household, assumptions: Assumptions, age: number): StopWorking {
  const years = household.persons.map((p) => ({ id: p.id, year: p.birth.year + age }))
  const lastStop = Math.max(...years.map((y) => y.year))
  const rows = runScenario(household, assumptions, everyoneAt(household, age), age).rows
  const full = rows.filter((r) => r.year > lastStop)
  const covers = full.find((r) => pensionsAfterTax(r) >= r.household.spending)
  const first = full[0] ?? rows.find((r) => r.year >= lastStop)
  // The year a pension begins is a part year (it starts the month after a birthday): the first FULL year is the next one.
  const allStartedYear = lastPensionStart(household) + 1
  const allRow = first && allStartedYear > first.year ? rows.find((r) => r.year === allStartedYear) : undefined
  return {
    years,
    pensionsCoverFrom: covers ? covers.year : null,
    firstYear: first ? first.year : lastStop,
    pensionShare: first ? shareOf(first) : 0,
    pensionsStarted: first ? pensionsOf(first) > 0 : false,
    allStarted: allRow ? { year: allRow.year, share: shareOf(allRow) } : null,
  }
}
