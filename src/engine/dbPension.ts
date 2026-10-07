import { roundTo } from './params/project.ts'
import type { Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'
import type { YearMonth } from './rrq.ts'
import type { DbPension } from './types.ts'

// A defined-benefit employer pension: a formula, not a balance. The pension is
//
//     accrual rate × years of service (to a maximum) × the average of the best-paid years' salary,
//
// reduced, permanently, if it starts before it would have been paid in full; reduced again from a given age
// to coordinate with the RRQ (the plan pays less once the state pension starts, since the state pension was
// built partly on the same earnings); optionally topped up by a bridge until a given age; and indexed each
// January by a plan-specific formula.
//
// This module knows the SHAPE of that formula; the numbers (2 %, 0.7 %, 61, 6 %, 35 years …) come from the
// plan's own booklet. For the Québec public-sector plan (RREGOP) they are the cited parameters of
// params/plans.ts, reproduced here against Retraite Québec's own worked examples; for any other plan the
// person enters them. Nothing about a particular plan is written in this file.

const monthIndex = (ym: YearMonth): number => ym.year * 12 + (ym.month - 1)

/** The date a person leaves the employer: the month of the birthday of `retirementAge`. */
export function leavingDate(birth: YearMonth, retirementAge: number): YearMonth {
  return { year: birth.year + retirementAge, month: birth.month }
}

/** Years (fractional, to the month) from `from` to `to`; never negative. */
export function yearsBetween(from: YearMonth, to: YearMonth): number {
  return Math.max(0, monthIndex(to) - monthIndex(from)) / 12
}

export interface DbInput {
  birth: YearMonth
  /** When employment ends. */
  leaving: YearMonth
  /** Today, to the month: the service credited at the statement date runs from here. */
  today: YearMonth
  /** Nominal salary in a calendar year (the engine's projection). */
  salaryAt: (year: number) => number
  /** The RRQ's maximum pensionable earnings of a calendar year. */
  mgaAt: (year: number) => number
}

export interface DbStart {
  /** Years of service the pension is calculated on (capped at the plan's maximum). */
  service: number
  /** The average of the best-paid years' salary the pension is built on. */
  averageSalary: number
  /** The pension before any reduction or coordination, per year. */
  formulaAnnual: number
  /** The age from which this person would have been paid in full — the reduction counts the years to it. */
  unreducedAge: number
  /** The reduction applied for starting early, as a fraction of the pension (0 when none). */
  earlyReduction: number
  /** Annual pension payable from the start up to the coordination age. */
  annualBeforeCoordination: number
  /** The annual coordination reduction taken from `coordinationFromYear` on. */
  coordinationAnnual: number
  /** The month (year × 12 + month − 1) of the first payment: the month after the birthday month of the start age. */
  startIndex: number
  /** The month the coordination begins — the month after the birthday month of the coordination age — or null. */
  coordinationIndex: number | null
  /** An extra annual amount paid up to and including the month of `bridgeEndIndex`, or 0. */
  bridgeAnnual: number
  bridgeEndIndex: number | null
  indexation: { share: number; minus: number }
  /** A pension in pay whose amount changes at 65: the month it changes, and the new annual amount in today's dollars. */
  afterIndex?: number | null
  afterAnnual?: number
  /**
   * The share of the YEAR the pension is paid in its first year, from the first of its first month: the first January
   * indexation is only that share of the full rate (see `firstIndexationShare`). 1 when the pension starts in January.
   */
  firstYearShare?: number
  /** A deferred pension (the member left before being eligible): the calendar year of leaving, and the indexation it gets until payment. */
  deferredFromYear?: number | null
  deferredIndexation?: { share: number; minus: number }
}

/** True for a leap year. */
const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * The days of `year` from the first day of the 0-based `month` to 31 December, both ends counted, and the days in that
 * year. The engine is month-granular, so a pension is read as taking effect on the 1st of its first month.
 */
export function daysPaidFromMonth(year: number, month: number): { paid: number; inYear: number } {
  const inYear = isLeap(year) ? 366 : 365
  let before = 0
  for (let m = 0; m < month; m++) before += m === 1 && isLeap(year) ? 29 : MONTH_DAYS[m]
  return { paid: inYear - before, inYear }
}

/**
 * The share of the full January indexation a pension gets the FIRST time, because it was paid for only part of the year
 * before: « the number of days the pension was paid in its first year ÷ 365 (366 in a leap year) » (Retraite Québec, RREGOP,
 * « L'indexation (réajustement) de la rente »). A pension paid the whole year gets the whole rate.
 */
export function firstIndexationShare(daysPaid: number, daysInYear: number): number {
  return Math.min(1, Math.max(0, daysPaid / daysInYear))
}

/** The January increase of an amount of `annual`: `annual × rate × share`, to the cent — the unit of Retraite Québec's worked example. */
export function indexationIncrease(annual: number, rate: number, share = 1): number {
  return roundTo(annual * rate * share, 0.01)
}

/** The last calendar year of work: the year before leaving, or the leaving year itself when leaving is after January. */
function lastWorkedYear(input: DbInput): number {
  return input.leaving.month === 1 ? input.leaving.year - 1 : input.leaving.year
}

/** The average salary over the `years` calendar years that end with the last year worked. The best-paid years, for a salary that does not fall. */
export function averageSalary(input: DbInput, years: number): number {
  let sum = 0
  for (let i = 0; i < years; i++) sum += input.salaryAt(lastWorkedYear(input) - i)
  return sum / years
}

/** The average of the MGA over the same years — what a plan coordinates against. */
export function averageMga(input: DbInput, years: number): number {
  let sum = 0
  for (let i = 0; i < years; i++) sum += input.mgaAt(lastWorkedYear(input) - i)
  return sum / years
}

/**
 * The age from which a member with `service` years would be paid WITHOUT reduction: the earliest of the
 * plan's three routes — the unreduced age, enough service at any age (then from the earliest age at all), and
 * the age-plus-service « factor » once the member is old enough for it.
 */
export function unreducedAge(p: DbPension, service: number): number {
  const routes = [p.unreduced.age]
  if (p.unreduced.serviceYears !== null && service >= p.unreduced.serviceYears) routes.push(p.earliestAge)
  if (p.unreduced.factor !== null) routes.push(Math.max(p.unreduced.factor.minAge, p.unreduced.factor.total - service))
  return Math.max(p.earliestAge, Math.min(...routes))
}

/** What the pension is, once, at the age the person chooses to start it. */
export function dbStart(p: DbPension, input: DbInput): DbStart {
  if (p.inPay) return inPayStart(p, input)
  const raw = p.serviceYearsToDate + yearsBetween(input.today, input.leaving) * p.serviceRatePerYear
  const service = p.maxServiceYears === null ? raw : Math.min(raw, p.maxServiceYears)
  const avg = averageSalary(input, p.averagingYears)
  const formulaAnnual = p.accrualRate * service * avg

  // The reduction counts the YEARS (to the month) between the start and the earliest date the member could have been paid in full.
  const startAge = Math.max(p.startAge, p.earliestAge)
  const unreduced = unreducedAge(p, service)
  // A member who LEAVES before being eligible for any pension has a deferred pension: the reduction counts the years from the
  // start to the plan's `deferred.toAge` (65 for RREGOP), not to the unreduced age. Eligible = old enough for the earliest
  // (reduced) pension, or holding the service that pays one at any age.
  const leavingAge = yearsBetween(input.birth, input.leaving)
  const eligibleAtLeaving = leavingAge >= p.earliestAge || (p.unreduced.serviceYears !== null && service >= p.unreduced.serviceYears)
  const isDeferred = p.deferred !== undefined && !eligibleAtLeaving
  const reduceToAge = isDeferred ? p.deferred!.toAge : unreduced
  const earlyReduction = Math.min(1, Math.max(0, reduceToAge - startAge) * p.earlyReductionPerYear)
  const annualBeforeCoordination = formulaAnnual * (1 - earlyReduction)

  // Coordination reads the LAST years' salary and the same years' MGA, and its service is capped (35 for RREGOP).
  const coordinationAnnual = p.coordination
    ? p.coordination.rate * Math.min(service, p.coordination.maxYears) * Math.min(avg, averageMga(input, p.averagingYears))
    : 0

  const atAge = (age: number): number => monthIndex({ year: input.birth.year + age, month: input.birth.month }) + 1
  // The deferred pension is coordinated from the day it starts, by the same share as the pension is reduced.
  const coordinationShown = isDeferred ? coordinationAnnual * (1 - earlyReduction) : coordinationAnnual
  const startIndex = atAge(startAge)
  const first = daysPaidFromMonth(Math.floor(startIndex / 12), startIndex % 12)
  return {
    service: roundTo(service, 0.01),
    averageSalary: roundTo(avg, 0.01),
    formulaAnnual: roundTo(formulaAnnual, 0.01),
    unreducedAge: unreduced,
    earlyReduction,
    annualBeforeCoordination: roundTo(annualBeforeCoordination, 0.01),
    coordinationAnnual: roundTo(coordinationShown, 0.01),
    startIndex,
    coordinationIndex: p.coordination ? (isDeferred ? Math.min(startIndex, atAge(p.coordination.fromAge)) : atAge(p.coordination.fromAge)) : null,
    bridgeAnnual: p.bridge ? roundTo(p.bridge.share * annualBeforeCoordination, 0.01) : 0,
    bridgeEndIndex: p.bridge ? atAge(p.bridge.untilAge) - 1 : null,
    indexation: p.indexation,
    firstYearShare: firstIndexationShare(first.paid, first.inYear),
    deferredFromYear: isDeferred ? input.leaving.year : null,
    deferredIndexation: isDeferred ? p.deferred!.indexation : undefined,
  }
}

/**
 * A pension already in pay: the stated annual amount is what is received from January of today's year (every month of
 * this year counts), with no formula, reduction, coordination or bridge — the statement's figure already includes them —
 * and the plan's indexation applies each January from the next one. `today` is the inflation base, so the figure is
 * in the dollars of the current year, exactly as every other « today's dollars » input.
 */
function inPayStart(p: DbPension, input: DbInput): DbStart {
  const annual = roundTo(p.inPay!.annual, 0.01)
  return {
    service: 0,
    averageSalary: 0,
    formulaAnnual: annual,
    unreducedAge: p.earliestAge,
    earlyReduction: 0,
    annualBeforeCoordination: annual,
    coordinationAnnual: 0,
    startIndex: input.today.year * 12,
    coordinationIndex: null,
    bridgeAnnual: 0,
    bridgeEndIndex: null,
    indexation: p.indexation,
    ...afterAge65(p, input),
  }
}

/** The step of a pension in pay at 65 — only when that month is still ahead of today. */
function afterAge65(p: DbPension, input: DbInput): { afterIndex: number | null; afterAnnual?: number } {
  const after = p.inPay?.after65
  if (after === undefined) return { afterIndex: null }
  const index = monthIndex({ year: input.birth.year + 65, month: input.birth.month }) + 1
  if (index <= input.today.year * 12 + input.today.month - 1) return { afterIndex: null }
  return { afterIndex: index, afterAnnual: roundTo(after, 0.01) }
}

/** The yearly increase of a pension in pay for a given inflation: the greater of `share` × inflation and inflation − `minus`, never negative. */
export function indexationRate(inflation: number, ix: { share: number; minus: number }): number {
  return Math.max(0, ix.share * inflation, inflation - ix.minus)
}

/**
 * The pension received in `year`, in that year's dollars, month by month: nothing before the first payment;
 * the pension from then, less the coordination from ITS month (the month after the 65th birthday — even when
 * the RRQ was taken earlier), plus the bridge up to its last month. The pension is indexed each January from the
 * year after it starts — the FIRST of those is only the share of the rate matching the days it was paid that year
 * (`firstYearShare`); the coordination amount, a fixed sum when it first applies, is indexed from the year after THAT.
 * A deferred pension is first indexed, in full, from the January after leaving to the January of its start year.
 */
export function dbYear(s: DbStart, year: number, inflation: number): number {
  const rate = indexationRate(inflation, s.indexation)
  const startYear = Math.floor(s.startIndex / 12)
  const grown = (years: number): number => (years <= 0 ? 1 : (1 + rate * (s.firstYearShare ?? 1)) * (1 + rate) ** (years - 1))
  const waiting =
    s.deferredFromYear != null && s.deferredIndexation
      ? (1 + indexationRate(inflation, s.deferredIndexation)) ** Math.max(0, startYear - s.deferredFromYear)
      : 1
  const pension = s.annualBeforeCoordination * waiting * grown(year - startYear)
  let total = 0
  for (let m = 0; m < 12; m++) {
    const idx = year * 12 + m
    if (idx < s.startIndex) continue
    let annual = pension
    if (s.coordinationIndex !== null && idx >= s.coordinationIndex) {
      annual -= s.coordinationAnnual * waiting * (1 + rate) ** Math.max(0, year - Math.floor(s.coordinationIndex / 12))
    }
    if (s.afterIndex != null && s.afterAnnual !== undefined && idx >= s.afterIndex) annual = s.afterAnnual * grown(year - startYear)
    if (s.bridgeEndIndex !== null && idx <= s.bridgeEndIndex) annual += s.bridgeAnnual
    total += Math.max(0, annual) / 12
  }
  return roundTo(total, 0.01)
}

/**
 * The pension adjustment a plan reports for a year of membership — what the plan takes out of the member's RRSP
 * room: (9 × the benefit earned in the year) − $600, never below zero. The benefit earned is the accrual rate
 * × the year's salary × the share of a year of service credited.
 */
export function pensionAdjustment(
  pensions: readonly DbPension[],
  salary: number,
  accruing: boolean,
  rules: Plain<YearParams>['accounts'],
): number {
  if (!accruing) return 0
  return pensions.reduce(
    (sum, p) => p.inPay ? sum : sum + Math.max(0, rules.pensionAdjustmentFactor * p.accrualRate * p.serviceRatePerYear * salary - rules.pensionAdjustmentOffset),
    0,
  )
}
