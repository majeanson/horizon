import { roundTo } from './params/project.ts'

// The Régime de rentes du Québec (RRQ / QPP): contributions while working, and the retirement
// pension that results.
//
// Every rule below is Retraite Québec's, taken from its three published calculation leaflets
// (the June 2025 edition: 1036-1f, 1036-2a, 1036-3a) and its citizen pages, and reproduced to the
// dollar against the leaflet's own worked example (engine/verified/rrq.verified.test.ts). The
// figures the rules use (rates, ceilings, phase-in factors) arrive as an `RrqRules` value built
// from the cited params — nothing numeric that is really a government figure is written here.
//
// SHAPE OF THE CALCULATION (the pension is the SUM OF THREE COMPONENTS, then ADJUSTED for the
// age at which it starts):
//
//   1. BASE PLAN — 25 % of the average of a person's adjusted monthly earnings, over the whole
//      contributory career (from the month after the 18th birthday to the month before the
//      pension starts), after dropping the 15 % of months with the lowest earnings. « Adjusted »
//      means re-expressed in the dollars of the year the pension starts: each year's earnings
//      (capped at that year's ceiling) × AMPE5 / that year's ceiling, where AMPE5 is the average
//      ceiling of the five years ending with the start year.
//   2. FIRST ADDITIONAL COMPONENT — 8.33 % of adjusted earnings from 2019 on, divided by 480
//      (40 years, whatever the length of the period so far), each year weighted by the phase-in
//      factor of the contribution rate it was earned under (15 / 30 / 50 / 75 % for 2019–2022,
//      100 % after). No months are dropped.
//   3. SECOND ADDITIONAL COMPONENT — 33.33 % of the adjusted earnings BETWEEN the ceiling and the
//      additional ceiling, from 2024 on, divided by 480. No months are dropped.
//   4. ADJUSTMENT — before 65, the whole pension is reduced by (0.5 + 0.1 × base ÷ maximum base)
//      % per month early (0.5 to 0.6 %); after 65 it is raised 0.7 % per month, to a maximum of
//      84 months (+58.8 % at 72).
//
// Months, not years, are the unit of the reference period, so a career that starts or ends
// mid-year is counted exactly. Money is dollars (a plain number), rounded to the cent at each
// component's output as the leaflets round it.

/** A calendar month, 1–12, in a year. */
export interface YearMonth {
  year: number
  month: number
}

/** The figures and rules the RRQ calculation reads — built from the cited params, never typed here. */
export interface RrqRules {
  /** The MGA (maximum pensionable earnings) of any year, past or projected. */
  mga: (year: number) => number
  /** The additional maximum (YAMPE), or null for a year before the second additional plan existed. */
  yampe: (year: number) => number | null
  /** 0.25 — the base plan's replacement rate. */
  baseRate: number
  /** 0.15 — the share of the lowest-earning months dropped from the base calculation. */
  excludedShare: number
  /** 0.0833 — the first additional component's replacement rate. */
  firstRate: number
  /** 0.3333 — the second additional component's replacement rate. */
  secondRate: number
  /** 2019 — the first year earnings count towards the first additional component. */
  firstFrom: number
  /** 2024 — the first year earnings count towards the second additional component. */
  secondFrom: number
  /** Phase-in factor by contribution year (2019 → 0.15 …). A year not listed is fully phased in. */
  phaseIn: Readonly<Record<number, number>>
  /** 480 — the divisor of both additional components (and the cap on the months they average). */
  additionalMonths: number
  /** 0.005 — the early-start reduction per month (a fraction) at the smallest pensions. */
  earlyBase: number
  /** 0.001 — what the monthly reduction rises by at the maximum base pension: × (base ÷ maximum base). */
  earlySlope: number
  /** 0.007 — the late-start increase per month (a fraction). */
  latePerMonth: number
  /** 84 — the late-start increase stops this many months after 65 (age 72). */
  lateMaxMonths: number
  /** 2024 — from this year a pension that starts after 65 keeps the higher of two base-plan calculations. */
  lateProtectionFrom: number
  /** 18 — the reference period begins the month after this birthday. */
  careerStartAge: number
  /** 72 — the reference period ends no later than this birthday's month. */
  careerMaxAge: number
  /** 65 — the age at which a pension is neither reduced nor increased. */
  normalAge: number
}

export interface RrqPensionInput {
  birth: YearMonth
  /** Pensionable earnings by calendar year (the relevé's « Revenus de travail admissibles »). A missing year is zero. */
  earnings: Readonly<Record<number, number>>
  /** Whole years, 60 to 72: the pension starts the month AFTER the birthday month of this age. */
  startAge: number
}

export interface RrqPension {
  /** The monthly pension at the start, adjusted for the start age, rounded to the cent. */
  monthly: number
  /** The base-plan component, at the normal-age basis, to the cent. */
  base: number
  /** The first additional component, to the cent. */
  additionalFirst: number
  /** The second additional component, to the cent. */
  additionalSecond: number
  /** The multiplier the start age applies to the total (< 1 early, > 1 late, 1 at 65). */
  adjustment: number
  /** Months in the reference period. */
  referenceMonths: number
  /** Months dropped from the base calculation. */
  excludedMonths: number
  /** The leaflet's « total of adjusted earnings » over the reference period, before any month is dropped. */
  adjustedTotal: number
  /** The adjusted earnings of the dropped months. */
  excludedTotal: number
  /** The average ceiling of the five years ending with the start year. */
  ampe5: number
  /** The maximum base-plan pension of the start year: base rate × AMPE5 ÷ 12. */
  maxBase: number
  /** The month the first payment is made. */
  start: YearMonth
}

const monthIndex = (ym: YearMonth): number => ym.year * 12 + (ym.month - 1)
const fromIndex = (i: number): YearMonth => ({ year: Math.floor(i / 12), month: (i % 12) + 1 })

/** The average ceiling of the five years ending with `year`. Retraite Québec does not publish a table of it; it publishes the method. */
export function ampe5(year: number, rules: RrqRules): number {
  let sum = 0
  for (let y = year - 4; y <= year; y++) sum += rules.mga(y)
  return sum / 5
}

/** Months of each calendar year that fall inside [from, to] (inclusive month indexes). */
function monthsByYear(fromIdx: number, toIdx: number): { year: number; months: number }[] {
  const out = new Map<number, number>()
  for (let i = fromIdx; i <= toIdx; i++) {
    const y = Math.floor(i / 12)
    out.set(y, (out.get(y) ?? 0) + 1)
  }
  return [...out].map(([year, months]) => ({ year, months }))
}

interface MonthBlock {
  /** Value of each of the `months` months in this block. */
  perMonth: number
  months: number
}

/** The sum of the best `limit` months among blocks of equal-valued months. */
function bestMonthsSum(blocks: MonthBlock[], limit: number): number {
  const sorted = [...blocks].sort((a, b) => b.perMonth - a.perMonth)
  let left = limit
  let sum = 0
  for (const b of sorted) {
    if (left <= 0) break
    const take = Math.min(b.months, left)
    sum += take * b.perMonth
    left -= take
  }
  return sum
}

/**
 * The base-plan monthly pension for a pension that starts in `start`. `ampe` is passed in so the
 * « highest of two calculations » protection (after 65) can re-run this with another start year's
 * average without recomputing it.
 */
interface BaseResult {
  pension: number
  months: number
  excluded: number
  /** Σ of every year's adjusted earnings before the drop-out (the leaflet's « total of adjusted earnings »). */
  adjustedTotal: number
  /** Σ of the adjusted earnings of the dropped months. */
  excludedTotal: number
}

/** The first month of the reference period: the month after the 18th birthday. */
const careerStartIndex = (input: RrqPensionInput, rules: RrqRules): number => monthIndex({ year: input.birth.year + rules.careerStartAge, month: input.birth.month }) + 1

function basePension(input: RrqPensionInput, rules: RrqRules, startIdx: number, ampe: number): BaseResult {
  const careerStart = careerStartIndex(input, rules)
  const careerEnd = Math.min(startIdx - 1, monthIndex({ year: input.birth.year + rules.careerMaxAge, month: input.birth.month }))
  if (careerEnd < careerStart) return { pension: 0, months: 0, excluded: 0, adjustedTotal: 0, excludedTotal: 0 }

  const years = monthsByYear(careerStart, careerEnd)
  const totalMonths = years.reduce((s, y) => s + y.months, 0)

  // Each year contributes `months` months worth `adjusted / months` each. The ceiling of a PARTIAL
  // year is pro-rated by its months, exactly as the leaflet does: $71 300 × 11 ÷ 12 = $65 358.
  const blocks = years.map(({ year, months }) => {
    const mga = rules.mga(year)
    const capped = Math.min(input.earnings[year] ?? 0, (mga * months) / 12)
    const adjusted = (capped * ampe) / mga
    return { perMonth: adjusted / months, months, adjusted }
  })

  // s. 116.4 of the QPP Act: 15 % of the months « counting any fraction of a month as a whole month » — rounded UP
  // (84.6 → 85, 66.6 → 67 in the leaflets). (Its other limit, the months over 120, cannot bind: the period is 504 months at 60.)
  const excluded = Math.ceil(rules.excludedShare * totalMonths - 1e-9)
  const kept = totalMonths - excluded
  if (kept <= 0) return { pension: 0, months: totalMonths, excluded, adjustedTotal: 0, excludedTotal: 0 }

  const total = blocks.reduce((s, b) => s + b.adjusted, 0)
  const dropped = [...blocks]
    .sort((a, b) => a.perMonth - b.perMonth)
    .reduce(
      (acc, b) => {
        const take = Math.min(b.months, acc.left)
        return { sum: acc.sum + take * b.perMonth, left: acc.left - take }
      },
      { sum: 0, left: excluded },
    ).sum

  const averageMonthly = (total - dropped) / kept
  return { pension: roundTo(rules.baseRate * averageMonthly, 0.01), months: totalMonths, excluded, adjustedTotal: total, excludedTotal: dropped }
}

/** First additional component: 8.33 % × (phase-in-weighted adjusted earnings from 2019) ÷ 480. */
function firstAdditional(input: RrqPensionInput, rules: RrqRules, startIdx: number, ampe: number): number {
  // The component's own start (1 January 2019), but never before the month after the 18th birthday: for someone who
  // turns 18 later, the year they do is a PARTIAL year, with its ceiling pro-rated by its months, as in the base plan.
  const from = Math.max(monthIndex({ year: rules.firstFrom, month: 1 }), careerStartIndex(input, rules))
  const end = startIdx - 1
  if (end < from) return 0
  const blocks = monthsByYear(from, end).map(({ year, months }) => {
    const mga = rules.mga(year)
    const capped = Math.min(input.earnings[year] ?? 0, (mga * months) / 12)
    const weighted = ((capped * ampe) / mga) * (rules.phaseIn[year] ?? 1)
    return { perMonth: weighted / months, months }
  })
  const best = bestMonthsSum(blocks, rules.additionalMonths)
  return roundTo((rules.firstRate * best) / rules.additionalMonths, 0.01)
}

/** Second additional component: 33.33 % × (adjusted earnings between the ceiling and the additional ceiling, from 2024) ÷ 480. */
function secondAdditional(input: RrqPensionInput, rules: RrqRules, startIdx: number, ampe: number): number {
  const from = Math.max(monthIndex({ year: rules.secondFrom, month: 1 }), careerStartIndex(input, rules))
  const end = startIdx - 1
  if (end < from) return 0
  const blocks = monthsByYear(from, end).map(({ year, months }) => {
    const mga = rules.mga(year)
    const yampe = rules.yampe(year)
    if (yampe === null) return { perMonth: 0, months }
    const band = Math.max(0, Math.min(input.earnings[year] ?? 0, yampe) - mga)
    // The band of a partial year is pro-rated by its months too ($9 900 × 11 ÷ 12 = $9 075).
    const capped = Math.min(band, ((yampe - mga) * months) / 12)
    return { perMonth: ((capped * ampe) / mga) / months, months }
  })
  const best = bestMonthsSum(blocks, rules.additionalMonths)
  return roundTo((rules.secondRate * best) / rules.additionalMonths, 0.01)
}

/** The multiplier the start age applies to the pension (the leaflets' « adjustment factor »). */
export function adjustmentFactor(startAge: number, basePension: number, maxBase: number, rules: RrqRules): number {
  const monthsFrom65 = Math.round((startAge - rules.normalAge) * 12)
  if (monthsFrom65 < 0) {
    // The reduction depends on the SIZE of the pension: 0.5 % per month at the smallest, up to
    // 0.6 % at the maximum. (Not a flat 0.6 %: Retraite Québec's own wording and worked example.)
    const ratio = maxBase > 0 ? Math.min(1, basePension / maxBase) : 0
    const perMonth = rules.earlyBase + rules.earlySlope * ratio
    return 1 + monthsFrom65 * perMonth
  }
  return 1 + Math.min(monthsFrom65, rules.lateMaxMonths) * rules.latePerMonth
}

/** The month the pension is first paid: the month after the birthday month of `startAge`. */
export function rrqStart(birth: YearMonth, startAge: number): YearMonth {
  return fromIndex(monthIndex({ year: birth.year + startAge, month: birth.month }) + 1)
}

export function rrqPension(input: RrqPensionInput, rules: RrqRules): RrqPension {
  const start = rrqStart(input.birth, input.startAge)
  const startIdx = monthIndex(start)
  const ampeStart = ampe5(start.year, rules)
  const maxBase = roundTo((rules.baseRate * ampeStart) / 12, 0.01)

  const base0 = basePension(input, rules, startIdx, ampeStart)
  let base = base0.pension

  // Since 2024, a person who starts AFTER 65 keeps the higher of two base-plan calculations: the
  // one at the actual start, and the one at 65 and one month, moved forward by the growth of the
  // average ceiling. Without it, working on (and earning less than the indexed past) could only
  // lower the pension.
  if (input.startAge > rules.normalAge && start.year >= rules.lateProtectionFrom) {
    const idx65 = monthIndex(rrqStart(input.birth, rules.normalAge))
    const ampe65 = ampe5(fromIndex(idx65).year, rules)
    const at65 = basePension(input, rules, idx65, ampe65).pension
    base = Math.max(base, roundTo((at65 * ampeStart) / ampe65, 0.01))
  }

  const additionalFirst = firstAdditional(input, rules, startIdx, ampeStart)
  const additionalSecond = secondAdditional(input, rules, startIdx, ampeStart)
  const total = roundTo(base + additionalFirst + additionalSecond, 0.01)
  const adjustment = adjustmentFactor(input.startAge, base, maxBase, rules)

  return {
    monthly: roundTo(total * adjustment, 0.01),
    base,
    additionalFirst,
    additionalSecond,
    adjustment,
    referenceMonths: base0.months,
    excludedMonths: base0.excluded,
    adjustedTotal: base0.adjustedTotal,
    excludedTotal: base0.excludedTotal,
    ampe5: ampeStart,
    maxBase,
    start,
  }
}

// ── Contributions ─────────────────────────────────────────────────────────────

/** The year's contribution parameters — the employee's share (the employer pays the same). */
export interface RrqContributionRules {
  mga: number
  /** The additional maximum, or null before 2024. */
  yampe: number | null
  /** 3 500 $ — earnings below this are not contributory. */
  exemption: number
  /** 0.053 in 2026 — the base plan's rate, on earnings between the exemption and the MGA. */
  baseRate: number
  /** 0.01 — the first additional plan's rate, on the same band. */
  firstRate: number
  /** 0.04 — the second additional plan's rate, on earnings between the MGA and the additional maximum. */
  secondRate: number
}

export interface RrqContribution {
  base: number
  additionalFirst: number
  additionalSecond: number
  total: number
}

/** An employee's RRQ contributions for a year of employment earnings, rounded to the cent. */
export function rrqContribution(earnings: number, r: RrqContributionRules): RrqContribution {
  const band = Math.max(0, Math.min(earnings, r.mga) - r.exemption)
  const upper = r.yampe === null ? 0 : Math.max(0, Math.min(earnings, r.yampe) - r.mga)
  const base = roundTo(band * r.baseRate, 0.01)
  const additionalFirst = roundTo(band * r.firstRate, 0.01)
  const additionalSecond = roundTo(upper * r.secondRate, 0.01)
  return { base, additionalFirst, additionalSecond, total: roundTo(base + additionalFirst + additionalSecond, 0.01) }
}
