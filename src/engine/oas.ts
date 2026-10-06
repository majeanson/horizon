import { roundTo } from './params/project.ts'
import type { Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'
import type { YearMonth } from './rrq.ts'

// Old Age Security (OAS) and the Guaranteed Income Supplement (GIS) — Service Canada.
//
// OAS is a flat pension, prorated by residence, raised by deferral and at 75, and CLAWED BACK from
// high incomes. The GIS is an income-tested top-up for the lowest incomes. Both are indexed to
// prices four times a year, which the engine reduces to one level per calendar year (params).
//
// What this models, in the order a person meets it:
//   1. WHEN it starts — the month after the birthday month of the chosen age (65 to 70), deferral
//      adding 0.6 % per month of delay, to 36 % at 70.
//   2. HOW MUCH — the full pension × (years of residence after 18 ÷ 40, whole completed years,
//      none under 10) × (1 + deferral) × 1.10 from the month after the 75th birthday. The 10 %
//      multiplies the DEFERRED amount.
//   3. WHAT IS TAKEN BACK — 15 % of net income above the recovery threshold, never more than the
//      pension received (the recovery tax, line 23500).
//   4. WHAT IS ADDED — the GIS, from the published maximum, cut-offs and top-up cut-offs of the
//      quarterly table, through the statutory slopes (params: the four GIS divisors).
//
// KNOWN SIMPLIFICATIONS (named in ENGINE.md §2): the recovery tax and the GIS use the SAME year's
// income, where the real rules use the previous year's income from July; the GIS assumes a
// full-residence pensioner (a partial pension changes it); the Allowance (a spouse aged 60–64) is
// not modelled, so such a spouse is treated as receiving no pension.

export type OasRules = Plain<YearParams>['oas']
export type GisCategoryName = 'single' | 'spouseOas' | 'spouseNone'

export interface OasPerson {
  birth: YearMonth
  /** Whole years, 65 to 70: the pension starts the month AFTER the birthday month of this age. */
  startAge: number
  /** The calendar year residence in Canada began (after 18), or the birth year + 18 for a lifelong resident. */
  residentSince: number
}

const monthIndex = (ym: YearMonth): number => ym.year * 12 + (ym.month - 1)

/** The month the pension is first paid: the month after the birthday month of `startAge`. */
export function oasStart(birth: YearMonth, startAge: number): YearMonth {
  const i = monthIndex({ year: birth.year + startAge, month: birth.month }) + 1
  return { year: Math.floor(i / 12), month: (i % 12) + 1 }
}

/**
 * The share of the full pension a person's residence earns: whole COMPLETED years after 18, ÷ 40,
 * rounded DOWN to a whole year (Act s. 3(4)); none under the minimum, all at 40 or more.
 * `startYear` is when the pension is approved; later residence cannot increase it (s. 3(5)).
 */
export function residenceFraction(person: OasPerson, startYear: number, rules: OasRules): number {
  const from = Math.max(person.residentSince, person.birth.year + 18)
  const years = Math.max(0, Math.floor(startYear - from))
  if (years >= rules.residenceYearsFull) return 1
  if (years < rules.residenceYearsMinimum) return 0
  return years / rules.residenceYearsFull
}

/** The deferral multiplier for starting at `startAge`: 0.6 % per month after 65, to 60 months. */
export function deferralMultiplier(startAge: number, rules: OasRules): number {
  const months = Math.min(rules.deferralMaxMonths, Math.max(0, Math.round((startAge - rules.startAgeMin) * 12)))
  return 1 + months * rules.deferralPerMonth
}

/** One calendar year of OAS. */
export interface OasYear {
  /** The pension received in the year, to the cent. */
  pension: number
  /** Months the pension is paid in the year (0–12). */
  months: number
}

/**
 * The OAS received in `year`: the monthly pension of that year's level, for every month from the
 * start, and 10 % higher from the month after the 75th birthday. `rules` are the figures OF THAT
 * YEAR (params.paramsFor(year)); the amount is indexed because the rules are.
 */
export function oasYear(year: number, person: OasPerson, rules: OasRules): OasYear {
  const start = oasStart(person.birth, person.startAge)
  const startIdx = monthIndex(start)
  const idx75 = monthIndex({ year: person.birth.year + 75, month: person.birth.month }) + 1
  const fraction = residenceFraction(person, start.year, rules)
  // Under the residence minimum there is no pension, so no month is « paid » — and the GIS, which
  // needs a pension in pay, must not be reached through `months`.
  if (fraction === 0) return { pension: 0, months: 0 }
  const base = rules.monthly65to74 * fraction * deferralMultiplier(person.startAge, rules)
  let months = 0
  let total = 0
  for (let m = 0; m < 12; m++) {
    const idx = year * 12 + m
    if (idx < startIdx) continue
    months++
    total += idx >= idx75 ? base * (1 + rules.increaseAt75) : base
  }
  return { pension: roundTo(total, 0.01), months }
}

/**
 * The recovery tax (« clawback »): 15 % of net income above the threshold, never more than the OAS
 * actually received. `netIncome` is net income BEFORE adjustments (line 23400) — it includes the OAS
 * pension itself.
 */
export function oasRecovery(netIncome: number, oasReceived: number, rules: OasRules): number {
  const owed = rules.recoveryRate * Math.max(0, netIncome - rules.recoveryThreshold)
  return roundTo(Math.min(owed, oasReceived), 0.01)
}

/** The net income at which a pension of `oasReceived` is recovered in full. */
export function oasFullRecoveryIncome(oasReceived: number, rules: OasRules): number {
  return rules.recoveryThreshold + oasReceived / rules.recoveryRate
}

// ── The Guaranteed Income Supplement ──────────────────────────────────────────────────────────────

/**
 * The income the GIS counts: net income WITHOUT the OAS and GIS themselves, less the employment-income
 * exemption — the first $5 000 in full, then half of the next $10 000.
 */
export function gisCountedIncome(incomeWithoutOas: number, employmentIncome: number, rules: OasRules): number {
  const e = Math.max(0, employmentIncome)
  const g = rules.gis
  const exempt = Math.min(g.employmentExemptionFull, e) + Math.min(g.employmentExemptionBand / 2, Math.max(0, e - g.employmentExemptionFull) / 2)
  return Math.max(0, incomeWithoutOas - exempt)
}

/** The three published shapes of the supplement, as one curve. */
interface GisCurve {
  /** Maximum monthly GIS at no income (the top-up included), per person. */
  max: number
  /** The base supplement at no income. */
  base: number
  /** Annual income at which the base supplement starts to fall (zero for all but a spouse with no pension). */
  baseFrom: number
  /** Monthly dollars the base supplement loses per annual dollar of income. */
  baseSlope: number
  /** The top-up at no income. */
  topUp: number
  /** Annual income at which the top-up starts to fall. */
  topUpFrom: number
  /** Monthly dollars the top-up loses per annual dollar above its start. */
  topUpSlope: number
}

/**
 * Builds the supplement's curve for a category from the PUBLISHED figures (maximum, cut-off, top-up
 * cut-off) and the STATUTORY slopes — so that the curve passes exactly through every number the
 * quarterly table prints, and takes its shape between them from the Act:
 *
 *   top-up  U = (top-up cut-off − its start) ÷ divisor          (it is gone at the published cut-off)
 *   base    M₀ = maximum − U                                    (the rest of the maximum)
 *   base falls by 1/divisor per annual dollar, and reaches zero AT the published cut-off — so it
 *   starts to fall at  cut-off − M₀ × divisor  (≈ 0 for a single pensioner or a couple of pensioners;
 *   ≈ $9 000 for a pensioner whose spouse receives no pension, who has an offsetting exemption).
 */
function curve(category: GisCategoryName, rules: OasRules): GisCurve {
  const g = rules.gis
  const cat = g[category]
  const couple = category !== 'single'
  const baseDivisor = couple ? g.baseDivisorCouple : g.baseDivisorSingle
  const topUpDivisor = couple ? g.topUpDivisorCouple : g.topUpDivisorSingle
  const topUpFrom = couple ? g.topUpStartCouple : g.topUpStartSingle
  const topUp = Math.max(0, (cat.topUpCutoff - topUpFrom) / topUpDivisor)
  const base = Math.max(0, cat.max - topUp)
  return {
    max: cat.max,
    base,
    baseFrom: Math.max(0, cat.cutoff - base * baseDivisor),
    baseSlope: 1 / baseDivisor,
    topUp,
    topUpFrom,
    topUpSlope: 1 / topUpDivisor,
  }
}

/**
 * The monthly GIS for a person in `category` at `income` — the person's own income for a single
 * pensioner, the couple's COMBINED income for the two couple categories. Never negative, never above
 * the published maximum. (The same-year-income and full-residence simplifications apply: see top.)
 */
export function gisMonthly(income: number, category: GisCategoryName, rules: OasRules): number {
  const c = curve(category, rules)
  const x = Math.max(0, income)
  const base = Math.max(0, c.base - Math.max(0, x - c.baseFrom) * c.baseSlope)
  const top = Math.max(0, c.topUp - Math.max(0, x - c.topUpFrom) * c.topUpSlope)
  return roundTo(Math.min(c.max, base + top), 0.01)
}

/** The category a pensioner falls in, from the spouse's situation. */
export function gisCategory(spouse: { present: boolean; receivesOas: boolean }): GisCategoryName {
  if (!spouse.present) return 'single'
  return spouse.receivesOas ? 'spouseOas' : 'spouseNone'
}
