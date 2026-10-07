// VERIFIED-AGAINST
// source:    https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html
// title:     Old Age Security - When to start your retirement pension - Canada.ca
// retrieved: 2026-10-06
// tolerance: exact to the cent (the deferral table is printed to the cent)
//
// Further sources, all read on 2026-10-06:
//   · https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/repayment.html
//       « Repayment of Old Age Security pension » — the worked example: income $100,000, threshold $93,454 → $981.90.
//   · https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-{january-march,april-june,july-september,october-december}.html
//       « Maximum Benefit Amounts and Related Figures … Old Age Security (<quarter> 2026) », Table 5 — OAS and GIS maxima, income cut-offs and top-up cut-offs.
//   · https://laws-lois.justice.gc.ca/eng/acts/o-9/FullText.html — Old Age Security Act, ss. 3, 7.1, 12, 12.1.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { allowanceMonthly, deferralMultiplier, gisCategory, gisCountedIncome, gisMonthly, gisWithAllowanceSpouseMonthly, oasFullRecoveryIncome, oasRecovery, oasStart, oasYear, residenceFraction, type GisCategoryName, type OasPerson, type OasRules } from '../oas.ts'

const RULES: OasRules = knownYear(2026).oas

// ── OAS ───────────────────────────────────────────────────────────────────────────────────────────

describe('deferral — the « when to start » table, Oct–Dec 2026 maximum $762.50', () => {
  // « 66: 12 months × 0.6% = 7.2% → $817.40 · 67: 24 months → 14.4% → $872.30 · 68: 36 → 21.6% → $927.20 ·
  //   69: 48 → 28.8% → $982.10 · 70: 60 months × 0.6% = 36% → $1,037.00 »
  it.each([
    [65, 762.5],
    [66, 817.4],
    [67, 872.3],
    [68, 927.2],
    [69, 982.1],
    [70, 1037.0],
  ])('starting at %d pays $%f a month', (age, expected) => {
    expect(Math.round(RULES.monthly65to74 * deferralMultiplier(age, RULES) * 100) / 100).toBe(expected)
  })

  it('the official 14-month example is 8.4 % (0.6 % × 14)', () => {
    expect(14 * RULES.deferralPerMonth).toBeCloseTo(0.084, 12)
  })

  it('stops at 60 months — waiting past 70 earns nothing more', () => {
    expect(deferralMultiplier(72, RULES)).toBe(deferralMultiplier(70, RULES))
  })

  it('and never goes below 1 for someone who starts at 65', () => {
    expect(deferralMultiplier(65, RULES)).toBe(1)
    expect(deferralMultiplier(60, RULES)).toBe(1)
  })
})

describe('the 10 % at 75 — Act s. 7.1(5), « the month after the month in which a person attains 75 »', () => {
  it('the 75-and-over maximum is $838.75, which is 762.50 × 1.10 exactly', () => {
    expect(RULES.monthly75plus).toBe(838.75)
    expect(Math.round(RULES.monthly65to74 * 1.1 * 100) / 100).toBe(838.75)
  })

  it('a person born in January 1951 who started at 65 gets $762.50 in January 2026 and $838.75 from February', () => {
    const p: OasPerson = { birth: { year: 1951, month: 1 }, startAge: 65, residentSince: 1969 }
    // January 2026: 12 months in the year, 11 of them at the 75+ rate.
    expect(oasYear(2026, p, RULES)).toEqual({ pension: 762.5 + 11 * 838.75, months: 12 })
  })

  it('the increase multiplies the DEFERRED amount: 60 months of deferral, then 10 % on top (1 037.00 → 1 140.70)', () => {
    const p: OasPerson = { birth: { year: 1951, month: 1 }, startAge: 70, residentSince: 1969 }
    // Started February 2021; the 75th birthday month is January 2026, so every month of 2026 is at the 75+ rate.
    const y = oasYear(2026, p, RULES)
    expect(y.months).toBe(12)
    expect(y.pension).toBeCloseTo(762.5 * 1.36 * 1.1 * 11 + 762.5 * 1.36, 1)
    expect(Math.round(762.5 * 1.36 * 1.1 * 100) / 100).toBe(1140.7)
  })

  it('rolls the month over December correctly: born in December, the increase starts in January of the next year', () => {
    const p: OasPerson = { birth: { year: 1951, month: 12 }, startAge: 65, residentSince: 1969 }
    expect(oasYear(2026, p, RULES).pension).toBe(Math.round(12 * 762.5 * 100) / 100) // 75th birthday Dec 2026: no increase in 2026
    expect(oasYear(2027, p, RULES).pension).toBe(Math.round(12 * 838.75 * 100) / 100)
  })
})

describe('when it starts', () => {
  it.each([
    [{ year: 1960, month: 11 }, 65, { year: 2025, month: 12 }],
    [{ year: 1960, month: 12 }, 65, { year: 2026, month: 1 }],
    [{ year: 1960, month: 3 }, 70, { year: 2030, month: 4 }],
  ])('born %j, start age %d → first payment %j', (birth, age, expected) => {
    expect(oasStart(birth, age)).toEqual(expected)
  })

  it('pays nothing in a year before the start, a partial year in the start year, and a full year after', () => {
    const p: OasPerson = { birth: { year: 1960, month: 8 }, startAge: 65, residentSince: 1978 } // starts Sep 2025
    expect(oasYear(2024, p, RULES)).toEqual({ pension: 0, months: 0 })
    expect(oasYear(2025, p, RULES).months).toBe(4) // Sep–Dec
    expect(oasYear(2026, p, RULES)).toEqual({ pension: 9150, months: 12 })
  })
})

describe('residence — Act s. 3: whole completed years after 18, ÷ 40, none under 10', () => {
  const arrived = (born: number, year: number): OasPerson => ({ birth: { year: born, month: 6 }, startAge: 65, residentSince: year })

  it('the official example: 20 years after 18 → 20 ÷ 40 = 50 %', () => {
    expect(residenceFraction(arrived(1960, 2005), 2025, RULES)).toBe(0.5) // 2025 − 2005 = 20
  })

  it.each([
    [40, 1],
    [47, 1], // a lifelong resident: 65 − 18
    [30, 0.75],
    [10, 0.25],
    [9, 0],
    [1, 0],
    [0, 0],
  ])('%d years of residence earns %f of the pension', (years, expected) => {
    expect(residenceFraction(arrived(1950, 2025 - years), 2025, RULES)).toBe(expected)
  })

  it('counts only completed years, rounding DOWN (s. 3(4)): the day before the 20th anniversary is still 19 years', () => {
    // 19.9 years → 19, not 20: modelled by whole calendar years, so 2005.1 is not representable; check the floor on the boundary.
    expect(Math.floor(19.9) / 40).toBe(0.475)
    expect(residenceFraction(arrived(1960, 2006), 2025, RULES)).toBe(19 / 40)
  })

  it('residence BEFORE 18 does not count: a lifelong resident is credited from the 18th birthday year', () => {
    expect(residenceFraction({ birth: { year: 1980, month: 1 }, startAge: 65, residentSince: 1980 }, 2045, RULES)).toBe(1) // 47 years
    expect(residenceFraction({ birth: { year: 1980, month: 1 }, startAge: 65, residentSince: 1990 }, 2045, RULES)).toBe(1) // 1998 → 47
  })

  it('the pension is prorated by it: 20 years → half the pension', () => {
    const p: OasPerson = { birth: { year: 1960, month: 1 }, startAge: 65, residentSince: 2005 } // starts Feb 2025; 20 years
    expect(oasYear(2026, p, RULES).pension).toBe(Math.round(12 * 762.5 * 0.5 * 100) / 100)
  })
})

describe('the recovery tax — « repayment » page', () => {
  // « The threshold for 2025 is $93,454. If your income in 2025 was $100,000, then your repayment would be
  //   15% of the difference … $100,000 − $93,454 = $6,546; $6,546 × 0.15 = $981.90. »
  const r2025: OasRules = { ...RULES, recoveryThreshold: 93_454 }

  it('the official example: 100 000 $ of income repays $981.90', () => {
    expect(oasRecovery(100_000, 9_000, r2025)).toBe(981.9)
  })

  it('repays nothing at or under the threshold', () => {
    expect(oasRecovery(93_454, 9_000, r2025)).toBe(0)
    expect(oasRecovery(50_000, 9_000, r2025)).toBe(0)
  })

  it('never repays more than the pension received', () => {
    expect(oasRecovery(500_000, 9_000, r2025)).toBe(9_000)
    expect(oasRecovery(500_000, 0, r2025)).toBe(0)
  })

  it('the 2026 income year: full recovery of a year\'s OAS lands on the 155 320 $ the quarterly page prints', () => {
    const yearsOas = 12 * ((742.31 + 743.05 + 751.97 + 762.5) / 4)
    expect(Math.abs(oasFullRecoveryIncome(yearsOas, RULES) - 155_320)).toBeLessThanOrEqual(1)
  })
})

// ── GIS ───────────────────────────────────────────────────────────────────────────────────────────
// The quarterly « Maximum Benefit Amounts and Related Figures » Table 5, 2026, as printed:
// per quarter and category: maximum monthly GIS (top-up included) · annual income cut-off · top-up cut-off,
// and the OAS maximum (ages 65–74) of that quarter.
interface Row {
  max: number
  cutoff: number
  topUpCutoff: number
}
interface Quarter {
  name: string
  oas: number
  single: Row
  spouseOas: Row
  spouseNone: Row
}
const QUARTERS: Quarter[] = [
  { name: 'January–March', oas: 742.31, single: { max: 1108.74, cutoff: 22_488, topUpCutoff: 10_256 }, spouseOas: { max: 667.41, cutoff: 29_712, topUpCutoff: 8_704 }, spouseNone: { max: 1108.74, cutoff: 53_904, topUpCutoff: 20_512 } },
  { name: 'April–June', oas: 743.05, single: { max: 1109.85, cutoff: 22_512, topUpCutoff: 10_256 }, spouseOas: { max: 668.08, cutoff: 29_760, topUpCutoff: 8_704 }, spouseNone: { max: 1109.85, cutoff: 53_952, topUpCutoff: 20_512 } },
  { name: 'July–September', oas: 751.97, single: { max: 1123.17, cutoff: 22_800, topUpCutoff: 10_352 }, spouseOas: { max: 676.09, cutoff: 30_096, topUpCutoff: 8_800 }, spouseNone: { max: 1123.17, cutoff: 54_624, topUpCutoff: 20_704 } },
  { name: 'October–December', oas: 762.5, single: { max: 1138.9, cutoff: 23_112, topUpCutoff: 10_496 }, spouseOas: { max: 685.56, cutoff: 30_528, topUpCutoff: 8_800 }, spouseNone: { max: 1138.9, cutoff: 55_392, topUpCutoff: 20_992 } },
]

const rulesFor = (q: Quarter): OasRules => ({
  ...RULES,
  monthly65to74: q.oas,
  gis: {
    ...RULES.gis,
    single: q.single,
    spouseOas: q.spouseOas,
    spouseNone: q.spouseNone,
  },
})

const CATEGORIES: GisCategoryName[] = ['single', 'spouseOas', 'spouseNone']

describe('GIS — the curve passes through every figure the quarterly table prints', () => {
  for (const q of QUARTERS) {
    const rules = rulesFor(q)
    for (const cat of CATEGORIES) {
      const row = q[cat]
      it(`${q.name}, ${cat}: the maximum $${row.max} at no income, and nothing at the cut-off $${row.cutoff}`, () => {
        expect(gisMonthly(0, cat, rules)).toBe(row.max)
        expect(gisMonthly(row.cutoff, cat, rules)).toBe(0)
        expect(gisMonthly(row.cutoff * 2, cat, rules)).toBe(0)
        expect(gisMonthly(row.cutoff - 24, cat, rules)).toBeGreaterThan(0)
      })

      it(`${q.name}, ${cat}: the top-up is gone exactly at its cut-off $${row.topUpCutoff}`, () => {
        // Just below the top-up cut-off the curve is steeper (base + top-up falling); at and above it only the base falls.
        const slope = (a: number, b: number) => (gisMonthly(a, cat, rules) - gisMonthly(b, cat, rules)) / (b - a)
        const below = slope(row.topUpCutoff - 600, row.topUpCutoff - 200)
        const above = slope(row.topUpCutoff + 200, row.topUpCutoff + 600)
        expect(below, 'steeper while the top-up is still falling').toBeGreaterThan(above * 1.3)
      })
    }
  }
})

describe('GIS — the statutory slopes, tested against FOUR independent sets of published figures', () => {
  // The four GIS divisors are DERIVED from the Act (params: `verify`). They predict relations
  // between published numbers that no single quarter was fitted to — so they can be wrong in a way
  // that four quarters of the government's own table would expose.
  for (const q of QUARTERS) {
    it(`${q.name}: the top-up (cut-off − start) ÷ divisor is the SAME for a single pensioner and a spouse with no pension`, () => {
      const single = (q.single.topUpCutoff - RULES.gis.topUpStartSingle) / RULES.gis.topUpDivisorSingle
      const none = (q.spouseNone.topUpCutoff - RULES.gis.topUpStartCouple) / RULES.gis.topUpDivisorCouple
      expect(Math.abs(single - none)).toBeLessThan(0.5)
    })

    it(`${q.name}: a spouse who receives the full OAS has a top-up of ≈ $50, the Act's « A = $50 »`, () => {
      const u = (q.spouseOas.topUpCutoff - RULES.gis.topUpStartCouple) / RULES.gis.topUpDivisorCouple
      expect(Math.abs(u - 50)).toBeLessThanOrEqual(1.5)
    })

    it(`${q.name}: a single pensioner's base supplement reaches zero within a few dollars of the printed cut-off with NO flat part (Z ≈ 0)`, () => {
      const u = (q.single.topUpCutoff - RULES.gis.topUpStartSingle) / RULES.gis.topUpDivisorSingle
      const z = q.single.cutoff - (q.single.max - u) * RULES.gis.baseDivisorSingle
      expect(z).toBeGreaterThanOrEqual(0)
      expect(z).toBeLessThanOrEqual(60)
    })

    it(`${q.name}: two pensioners — the same, with the couple's divisor`, () => {
      const u = (q.spouseOas.topUpCutoff - RULES.gis.topUpStartCouple) / RULES.gis.topUpDivisorCouple
      const z = q.spouseOas.cutoff - (q.spouseOas.max - u) * RULES.gis.baseDivisorCouple
      expect(Math.abs(z)).toBeLessThanOrEqual(80)
    })

    it(`${q.name}: for a spouse with no pension the flat part of the base is ≈ 12 × the OAS pension (rounded up to $4) — the Act's « B »`, () => {
      const u = (q.spouseNone.topUpCutoff - RULES.gis.topUpStartCouple) / RULES.gis.topUpDivisorCouple
      const z = q.spouseNone.cutoff - (q.spouseNone.max - u) * RULES.gis.baseDivisorCouple
      const b = Math.ceil(q.oas / 4) * 4
      expect(Math.abs(z - 12 * b)).toBeLessThanOrEqual(100)
    })
  }
})

describe('GIS — what counts as income: the employment exemption (Act s. 2, « income », (b.1))', () => {
  // « the first $5,000 … in full, then half of the next $10,000 » — a maximum exemption of $10,000.
  it.each([
    [0, 0],
    [4_000, 4_000],
    [5_000, 5_000],
    [10_000, 7_500],
    [15_000, 10_000],
    [40_000, 10_000],
  ])('earnings of %d exempt %d', (earnings, exempt) => {
    expect(gisCountedIncome(earnings, earnings, RULES)).toBe(earnings - exempt)
  })

  it('exempts employment income only — a pension of the same size counts in full', () => {
    expect(gisCountedIncome(12_000, 0, RULES)).toBe(12_000)
    expect(gisCountedIncome(20_000, 8_000, RULES)).toBe(20_000 - (5_000 + 1_500))
  })

  it('never goes below zero', () => {
    expect(gisCountedIncome(2_000, 20_000, RULES)).toBe(0)
  })

  it('the half-exempt band is its own figure, not twice the full exemption', () => {
    const wide: OasRules = { ...RULES, gis: { ...RULES.gis, employmentExemptionBand: 20_000 } }
    // 5 000 in full, then half of the next 20 000 (capped at 10 000 of exemption): 30 000 of earnings → 15 000 exempt.
    expect(gisCountedIncome(30_000, 30_000, wide)).toBe(30_000 - 15_000)
  })
})

describe('under the residence minimum there is no pension — and so no GIS', () => {
  it('a person with 8 years of residence at the start is paid nothing, in no month', () => {
    const p: OasPerson = { birth: { year: 1961, month: 6 }, startAge: 65, residentSince: 2018 }
    expect(oasYear(2027, p, RULES)).toEqual({ pension: 0, months: 0 })
  })
})

describe('which category', () => {
  it('no spouse → single; a spouse with OAS → spouseOas; a spouse without (under 65, or no pension) → spouseNone', () => {
    expect(gisCategory({ present: false, receivesOas: false })).toBe('single')
    expect(gisCategory({ present: true, receivesOas: true })).toBe('spouseOas')
    expect(gisCategory({ present: true, receivesOas: false })).toBe('spouseNone')
  })
})

// ── The OAS Benefits Estimator, read on 2026-10-07 for the « modest » example (a single person, born 1971-11) ─────────────────
// Entered: single, lived in Canada since 18, income excluding OAS 14 588 $ (QPP 10 926 + RRSP 3 662), no work income.
// It printed: « At 65, you could start receiving $1,117.99 per month: $762.50 from the Old Age Security pension, $355.49 from the
// Guaranteed Income Supplement ». A second entry, for a start 11 months after 65, printed OAS $812.83 and the same GIS $355.49.
describe('the OAS Benefits Estimator, Oct–Dec 2026, single person', () => {
  it('the GIS at 14 588 $ of income is within the estimator\'s $1 a month (it rounds the reduction to whole dollars, the engine works in cents)', () => {
    const gis = gisMonthly(14_588, 'single', RULES)
    expect(Math.abs(gis - 355.49)).toBeLessThan(1)
  })
  it('the OAS at 65 is $762.50, and 11 months later it is $812.83: the 0.6 % a month, to the cent', () => {
    expect(RULES.monthly65to74).toBe(762.5)
    expect(Math.round(762.5 * deferralMultiplier(65 + 11 / 12, RULES) * 100) / 100).toBe(812.83)
  })
})

// ── The same estimator, for the « newcomer » example (single, 67, 35 years of residence after 18, income 30 784 $, no deferral) ──
// It printed « You could receive $667.19 per month: $667.19 from the Old Age Security pension, $0 from the Guaranteed Income Supplement ».
describe('the OAS Benefits Estimator, Oct–Dec 2026, a partial pension', () => {
  it('35 years of residence after 18 earns 35/40 of $762.50 = $667.19, and an income of 30 784 $ leaves no GIS', () => {
    const person = { birth: { year: 1959, month: 2 }, startAge: 65, residentSince: 1989 } // 35 completed years by the 2024 start
    expect(residenceFraction(person, oasStart(person.birth, 65).year, RULES)).toBe(35 / 40)
    expect(Math.round(RULES.monthly65to74 * (35 / 40) * 100) / 100).toBe(667.19)
    expect(gisMonthly(30_784, 'single', RULES)).toBe(0)
  })
})

// ── The same estimator, for the « retired » couple (both on the OAS since 65, 47 years of residence, net incomes 36 546 $ and 19 842 $ without the OAS) ──
// It printed, for each of them, « $762.50 from the Old Age Security pension, $0 from the Guaranteed Income Supplement ».
describe('the OAS Benefits Estimator, Oct–Dec 2026, a couple both on the OAS with a combined income of 56 388 $', () => {
  it('each gets the full $762.50, and the combined income is far above the couple\'s GIS cut-off: no GIS', () => {
    const category = gisCategory({ present: true, receivesOas: true })
    expect(category).toBe('spouseOas')
    expect(gisMonthly(36_546 + 19_842, category, RULES)).toBe(0)
    expect(RULES.monthly65to74).toBe(762.5)
  })
})

// ── The same estimator, for the « rich » couple at 66 and 64: she is on the OAS, he is not yet (combined income 51 734 $ without the OAS) ──
// It printed « $838.99 per month: $762.50 from the Old Age Security pension, $76.49 from the Guaranteed Income Supplement », and an
// Allowance of $0 for the 64-year-old partner. A rich household is paid a small GIS because the test counts TAXABLE income, and a
// household that draws on non-registered money has little of it.
describe('the OAS Benefits Estimator, Oct–Dec 2026, one spouse on the OAS and the other not', () => {
  it('the GIS is within the estimator\'s $1 a month, in the category « spouse without the OAS »', () => {
    const category = gisCategory({ present: true, receivesOas: false })
    expect(category).toBe('spouseNone')
    expect(Math.abs(gisMonthly(32_980 + 18_754, category, RULES) - 76.49)).toBeLessThan(1)
  })
})

// ── The Allowance (the 60–64 spouse of a GIS recipient) — Table 4 of the Open Government Portal's « Table of Benefit Amounts », Oct–Dec 2026 ──
// https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0 — « Table 4 - GIS and Allowance for couple »: 941 rows,
// one per 48 $ of the couple's combined income, the Allowance and the GIS of the pensioner spouse. The copy beside this test keeps
// the four columns the model reads. The curve is a few breakpoints fitted to it: every row must be within $1 a month at its lower edge.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('the Allowance and the pensioner\'s GIS beside it, row by row against the official table', () => {
  const lines = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'data', 'oas-table4-2026q4.csv'), 'utf8').trim().split('\n').slice(1)
  const table = lines.map((l) => l.split(',').map(Number)) // from, to, gis, allowance

  it('the copy is the whole table: 941 bands from 0 to the cut-off', () => {
    expect(table.length).toBe(941)
    expect(table[0][0]).toBe(0)
    expect(Math.ceil(table[table.length - 1][1])).toBe(RULES.allowanceCutoff)
    expect(table[0][3]).toBe(RULES.allowanceMax)
  })

  it('the Allowance is within $1 a month of the table at the lower edge of every band', () => {
    let worst = 0
    for (const [from, , , allowance] of table) worst = Math.max(worst, Math.abs(allowanceMonthly(from, RULES) - allowance))
    expect(worst).toBeLessThan(1.0001)
  })

  it('the pensioner\'s GIS beside it is within $1 a month of the table at the lower edge of every band', () => {
    let worst = 0
    for (const [from, , gis] of table) worst = Math.max(worst, Math.abs(gisWithAllowanceSpouseMonthly(from, RULES) - gis))
    expect(worst).toBeLessThan(1.0001)
  })

  it('the Allowance is the maximum with no income, falls as income rises, and is nil at the cut-off', () => {
    expect(allowanceMonthly(0, RULES)).toBe(1_448.06)
    expect(allowanceMonthly(20_000, RULES)).toBeLessThan(allowanceMonthly(10_000, RULES))
    expect(allowanceMonthly(RULES.allowanceCutoff, RULES)).toBe(0)
    expect(allowanceMonthly(60_000, RULES)).toBe(0)
  })

  it('in a later year both axes scale with the maximum (prices): 5 % more money, 5 % more income for the same amount', () => {
    const later = { ...RULES, allowanceMax: RULES.allowanceMax * 1.05, allowanceCutoff: RULES.allowanceCutoff * 1.05 }
    expect(allowanceMonthly(0, later)).toBeCloseTo(1_448.06 * 1.05, 1)
    expect(allowanceMonthly(20_000 * 1.05, later)).toBeCloseTo(allowanceMonthly(20_000, RULES) * 1.05, 1)
  })
})
