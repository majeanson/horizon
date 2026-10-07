import { plain } from './params/cited.ts'
import { PLAN_RREGOP } from './params/plans.ts'
import type { DbPension } from './types.ts'

// A pre-filled DbPension for the plans this app knows. The person supplies only what is theirs — the years of
// service on their statement and the age they will start; every rule comes from the cited plan parameters.

const R = plain(PLAN_RREGOP)

/** The Québec public-sector plan (RREGOP): 2 % of the best-5 average, coordinated with the RRQ from 65. */
export function rregopPension(own: { serviceYearsToDate: number; startAge: number; serviceRatePerYear?: number }): DbPension {
  return {
    label: 'RREGOP',
    accrualRate: R.accrualRate,
    maxServiceYears: R.maxServiceYears,
    serviceYearsToDate: own.serviceYearsToDate,
    serviceRatePerYear: own.serviceRatePerYear ?? 1,
    averagingYears: R.averagingYears,
    coordination: { rate: R.coordinationRate, fromAge: R.coordinationFromAge, maxYears: R.coordinationMaxYears },
    earliestAge: R.earliestAge,
    unreduced: { age: R.unreducedAge, serviceYears: R.unreducedServiceYears, factor: { minAge: R.factorMinAge, total: R.factorTotal } },
    earlyReductionPerYear: R.earlyReductionPerYear,
    bridge: null,
    indexation: { share: R.indexationShare, minus: R.indexationMinus },
    startAge: own.startAge,
    deferred: { toAge: R.deferredToAge, indexation: { share: R.deferredIndexationShare, minus: R.deferredIndexationMinus } },
  }
}
