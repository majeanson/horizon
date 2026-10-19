import { paramsFor, knownYear, LAST_KNOWN_YEAR, type PlainYear } from './params/index.ts'
import type { Indexation } from './params/project.ts'
import { RRQ_CONTRIBUTION_RATE_HISTORY, RRQ_EXEMPTION_HISTORY, RRQ_INDEXATION_HISTORY, RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from './params/rrqHistory.ts'
import { rrqContribution, type RrqContribution, type RrqContributionRules, type RrqRules } from './rrq.ts'

// Builds the RRQ calculation's rules from the cited parameters. This is the seam between the data
// (src/engine/params/) and the formulas (src/engine/rrq.ts): rrq.ts knows no figure, and the
// params know no formula. Every number below is read, never written.

/**
 * The ceilings of a year are an OBSERVATION when the year is past (the history tables) and a
 * PROJECTION when it is not (the last known year's figure, moved by wage growth). The history
 * tables are exact to the dollar and run to 2026; paramsFor() carries on from there.
 */
export function makeRrqRules(indexation: Indexation): RrqRules {
  const k = knownYear(LAST_KNOWN_YEAR).rrq
  const mgaCache = new Map<number, number>()
  const yampeCache = new Map<number, number | null>()

  // the plan began with the first year of the table: before it there is no ceiling. A year earlier than that is asked for only by a pension that would START before the plan existed — an age no living
  // person has — and gets the first year's figure, so that it is a pension of nothing and not an error.
  const planStart = Math.min(...Object.keys(RRQ_MGA_HISTORY.value).map(Number))
  const mga = (asked: number): number => {
    const year = Math.max(asked, planStart)
    const hit = mgaCache.get(year)
    if (hit !== undefined) return hit
    const v = RRQ_MGA_HISTORY.value[year] ?? paramsFor(year, indexation).rrq.mga
    mgaCache.set(year, v)
    return v
  }
  const yampe = (year: number): number | null => {
    if (yampeCache.has(year)) return yampeCache.get(year) ?? null
    // Before the second additional plan existed there is no additional maximum.
    const v = year < k.secondFrom ? null : (RRQ_YAMPE_HISTORY.value[year] ?? paramsFor(year, indexation).rrq.yampe)
    yampeCache.set(year, v)
    return v
  }
  // The exemption and the base rate of a past year are the history tables'; a later year's are the last known year's (both are `fixed`).
  const exemptionOf = (year: number): number => RRQ_EXEMPTION_HISTORY.value[Math.max(year, planStart)] ?? k.exemption
  const baseContributionRateOf = (year: number): number => {
    const printed = RRQ_CONTRIBUTION_RATE_HISTORY.value[Math.max(year, planStart)]
    if (printed === undefined || year >= LAST_KNOWN_YEAR) return k.rateBase
    // From 2019 the printed rate is the base rate AND the first additional one, the latter at the year's phase-in (the page's note 1).
    return year < k.firstFrom ? printed : printed - k.rateFirst * (k.phaseIn[year] ?? 1)
  }

  return {
    mga,
    yampe,
    // the plan began with the first year of the ceilings table (1966): there is no ceiling, and no contributory period, before it
    planStartYear: planStart,
    baseRate: k.baseReplacement,
    excludedShare: k.excludedShare,
    exemption: k.exemption,
    exemptionOf,
    baseContributionRateOf,
    firstRate: k.firstReplacement,
    secondRate: k.secondReplacement,
    firstFrom: k.firstFrom,
    secondFrom: k.secondFrom,
    phaseIn: k.phaseIn,
    additionalMonths: k.additionalMonths,
    earlyBase: k.earlyBase,
    earlySlope: k.earlySlope,
    latePerMonth: k.latePerMonth,
    lateMaxMonths: k.lateMaxMonths,
    lateProtectionFrom: k.lateProtectionFrom,
    careerStartAge: k.careerStartAge,
    careerMaxAge: k.careerMaxAge,
    normalAge: k.normalAge,
  }
}

/** The employee's contribution rules for a year, from that year's figures already resolved (the employer pays the same). */
export function rrqContributionRulesOf(year: number, rrq: PlainYear['rrq']): RrqContributionRules {
  return {
    mga: RRQ_MGA_HISTORY.value[year] ?? rrq.mga,
    yampe: year < rrq.secondFrom ? null : (RRQ_YAMPE_HISTORY.value[year] ?? rrq.yampe),
    exemption: rrq.exemption,
    baseRate: rrq.rateBase,
    firstRate: rrq.rateFirst,
    secondRate: rrq.rateSecond,
  }
}

/** The employee's contribution rules for a year (the employer pays the same). Resolves the year's figures: a caller that already holds them uses `rrqContributionRulesOf`. */
export function rrqContributionRulesFor(year: number, indexation: Indexation): RrqContributionRules {
  return rrqContributionRulesOf(year, paramsFor(year, indexation).rrq)
}

const NO_CONTRIBUTION: RrqContribution = { base: 0, additionalFirst: 0, additionalSecond: 0, total: 0 }

/**
 * A worker's QPP contribution on a year's pay, at `age` (attained in the year): nothing after the year of the 72nd birthday (art. 37.0.1,
 * `contributionLastAge`). The ONE place the rule is applied — the projection and the take-home figure both read it, so they cannot disagree.
 */
export function rrqContributionAt(earnings: number, age: number, year: number, rrq: PlainYear['rrq']): RrqContribution {
  return earnings > 0 && age <= rrq.contributionLastAge ? rrqContribution(earnings, rrqContributionRulesOf(year, rrq)) : NO_CONTRIBUTION
}

/**
 * How much a QPP amount of `fromYear` has been raised by `toYear`: the product of every January's indexation in between (`fromYear` + 1 to
 * `toYear`). A January Retraite Québec has published is its OBSERVED rate (the history, and the last known year's own `rrq.indexation`); any
 * other — a future one, or one before the history begins — is the assumed inflation. 1 when `toYear` ≤ `fromYear`.
 */
export function makeQppIndexation(inflation: number): (fromYear: number, toYear: number) => number {
  const known = knownYear(LAST_KNOWN_YEAR).rrq.indexation
  const rateOf = (year: number): number => RRQ_INDEXATION_HISTORY.value[year] ?? (year === LAST_KNOWN_YEAR ? known : inflation)
  const cache = new Map<number, number>()
  return (fromYear, toYear) => {
    if (toYear <= fromYear) return 1
    const key = fromYear * 10_000 + toYear
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    let f = 1
    for (let y = fromYear + 1; y <= toYear; y++) f *= 1 + rateOf(y)
    cache.set(key, f)
    return f
  }
}
