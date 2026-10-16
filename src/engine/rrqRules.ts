import { paramsFor, knownYear, LAST_KNOWN_YEAR } from './params/index.ts'
import type { Indexation } from './params/project.ts'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from './params/rrqHistory.ts'
import type { RrqContributionRules, RrqRules } from './rrq.ts'

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

  return {
    mga,
    yampe,
    // the plan began with the first year of the ceilings table (1966): there is no ceiling, and no contributory period, before it
    planStartYear: planStart,
    baseRate: k.baseReplacement,
    excludedShare: k.excludedShare,
    exemption: knownYear(LAST_KNOWN_YEAR).rrq.exemption,
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

/** The employee's contribution rules for a year (the employer pays the same). */
export function rrqContributionRulesFor(year: number, indexation: Indexation): RrqContributionRules {
  const p = paramsFor(year, indexation).rrq
  return {
    mga: RRQ_MGA_HISTORY.value[year] ?? p.mga,
    yampe: year < p.secondFrom ? null : (RRQ_YAMPE_HISTORY.value[year] ?? p.yampe),
    exemption: p.exemption,
    baseRate: p.rateBase,
    firstRate: p.rateFirst,
    secondRate: p.rateSecond,
  }
}
