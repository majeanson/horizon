import { describe, expect, it } from 'vitest'
import { canadaChildBenefit, ccbRulesOf, childBenefitsFor, eligibleKids, familyAllowance, type CcbRules, type FamilyAllowanceRules } from './childBenefits.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import type { Household, YearRow } from './types.ts'

// WHAT THE STATE PAYS FOR A CHILD. The Canada Child Benefit is held to the eight worked examples the CRA prints on its « How much you can get » page (payments
// July 2026 to June 2027), to the cent; Québec's Allocation famille to rows of Retraite Québec's own 2025 table, which the formula reproduces.

// The CRA page, payments July 2026 to June 2027: https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-much.html
const CCB_2026: CcbRules = {
  maxUnder6: 8_157,
  max6to17: 6_883,
  threshold1: 38_237,
  threshold2: 82_847,
  midRate: [0.07, 0.135, 0.19, 0.23],
  topFixed: [3_123, 6_022, 8_476, 10_260],
  topRate: [0.032, 0.057, 0.08, 0.095],
}

describe('the Canada Child Benefit', () => {
  // [who, children under 6, children 6 to 17, adjusted family net income, the annual payment the page prints]
  const EXAMPLES: [string, number, number, number, number][] = [
    ['Martha, one child under 6, 45 000 $', 1, 0, 45_000, 7_683.59],
    ['Martha, one child under 6, 100 000 $', 1, 0, 100_000, 4_485.11],
    ['Fatima, two children under 6, 60 000 $', 2, 0, 60_000, 13_376.0],
    ['Fatima, two children under 6, 125 000 $', 2, 0, 125_000, 7_889.28],
    ['Julie, three children over 6, 50 000 $', 0, 3, 50_000, 18_414.03],
    ['Julie, three children over 6, 150 000 $', 0, 3, 150_000, 6_800.76],
    ['Kira, four children over 6, 45 000 $', 0, 4, 45_000, 25_976.51],
    ['Kira, four children over 6, 200 000 $', 0, 4, 200_000, 6_142.47],
  ]
  for (const [who, under6, from6, afni, expected] of EXAMPLES) {
    it(`${who}: ${expected.toFixed(2)} $`, () => {
      expect(canadaChildBenefit(afni, { under6, from6 }, CCB_2026)).toBeCloseTo(expected, 2)
    })
  }

  it('pays the maximum up to the first threshold, never goes below nothing, and pays nothing for no child', () => {
    expect(canadaChildBenefit(20_000, { under6: 1, from6: 1 }, CCB_2026)).toBe(8_157 + 6_883)
    expect(canadaChildBenefit(38_237, { under6: 2, from6: 0 }, CCB_2026)).toBe(16_314)
    expect(canadaChildBenefit(2_000_000, { under6: 1, from6: 0 }, CCB_2026)).toBe(0)
    expect(canadaChildBenefit(50_000, { under6: 0, from6: 0 }, CCB_2026)).toBe(0)
  })

  it('is continuous at both thresholds: no jump when income crosses one', () => {
    for (const kids of [{ under6: 1, from6: 0 }, { under6: 0, from6: 2 }, { under6: 2, from6: 2 }]) {
      for (const t of [CCB_2026.threshold1, CCB_2026.threshold2]) {
        expect(Math.abs(canadaChildBenefit(t - 0.01, kids, CCB_2026) - canadaChildBenefit(t + 0.01, kids, CCB_2026))).toBeLessThan(0.5)
      }
    }
  })

  it('falls as income rises, and a family of five reads the four-or-more row', () => {
    const k = { under6: 1, from6: 0 }
    expect(canadaChildBenefit(60_000, k, CCB_2026)).toBeGreaterThan(canadaChildBenefit(90_000, k, CCB_2026))
    const four = canadaChildBenefit(120_000, { under6: 0, from6: 4 }, CCB_2026)
    const five = canadaChildBenefit(120_000, { under6: 0, from6: 5 }, CCB_2026)
    expect(five - four).toBeCloseTo(6_883, 6) // the same reduction row (« four or more »): the fifth child adds exactly its maximum
  })
})

// Retraite Québec's amounts for 2025 (the year of the official table of payments by family income, which the formula reproduces row by row):
// https://www.retraitequebec.gouv.qc.ca/en/citizens/children/amounts-family-allowance-payments-based-family-income
const AF_2025: FamilyAllowanceRules = { max: 3_006, min: 1_196, supplementMax: 1_055, supplementMin: 421, reductionRate: 0.04, thresholdCouple: 59_369, thresholdSingle: 43_280 }

describe('Québec\'s Allocation famille', () => {
  it('reproduces rows of the official 2025 table: a couple with one child at 100 000 $, a single parent with two at 80 000 $, a couple with two at 150 000 $ (the floor)', () => {
    expect(Math.round(familyAllowance(100_000, false, 1, AF_2025))).toBe(1_381)
    expect(Math.round(familyAllowance(80_000, true, 2, AF_2025))).toBe(5_598)
    expect(Math.round(familyAllowance(150_000, false, 2, AF_2025))).toBe(2_392)
  })

  it('pays the maximum up to the threshold and the minimum from far above; the single-parent supplement is paid once, whatever the number of children', () => {
    expect(familyAllowance(30_000, false, 1, AF_2025)).toBe(3_006)
    expect(familyAllowance(30_000, false, 3, AF_2025)).toBe(3 * 3_006)
    expect(familyAllowance(30_000, true, 1, AF_2025)).toBe(3_006 + 1_055)
    expect(familyAllowance(30_000, true, 3, AF_2025)).toBe(3 * 3_006 + 1_055)
    expect(familyAllowance(1_000_000, false, 2, AF_2025)).toBe(2 * 1_196)
    expect(familyAllowance(1_000_000, true, 2, AF_2025)).toBe(2 * 1_196 + 421)
    expect(familyAllowance(50_000, false, 0, AF_2025)).toBe(0)
  })

  it('falls by 4 cents per dollar of income over the threshold, between the maximum and the minimum', () => {
    const a = familyAllowance(70_000, false, 1, AF_2025)
    const b = familyAllowance(80_000, false, 1, AF_2025)
    expect(a - b).toBeCloseTo(400, 6)
  })
})

describe('the children a family is paid for', () => {
  it('counts the ones under 6 and the ones aged 6 to 17, in the year; a child still to come or already 18 counts for nothing', () => {
    const births = [2026, 2021, 2020, 2010, 2009, 2008, 2030]
    // ages 0 and 5 are under 6; 6, 16 and 17 are 6 to 17; 18 (2008) is out, and 2030 is not born yet
    expect(eligibleKids(births, 2026)).toEqual({ under6: 2, from6: 3 })
  })
})

describe('the published figures in the parameters, held to the pages they were read on', () => {
  const P = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 })

  it('give the CCB rules typed from the CRA page, and so reproduce its worked examples', () => {
    expect(ccbRulesOf(P.childBenefits.ccb)).toEqual(CCB_2026)
    expect(canadaChildBenefit(100_000, { under6: 1, from6: 0 }, ccbRulesOf(P.childBenefits.ccb))).toBeCloseTo(4_485.11, 2)
    expect(canadaChildBenefit(200_000, { under6: 0, from6: 4 }, ccbRulesOf(P.childBenefits.ccb))).toBeCloseTo(6_142.47, 2)
  })

  it('give the four amounts Retraite Québec prints for 2026: 3 068 $ and 1 221 $ for two parents, 4 145 $ and 1 651 $ for a single parent', () => {
    const af = P.childBenefits.familyAllowance
    expect(familyAllowance(60_000, false, 1, af)).toBe(3_068)
    expect(familyAllowance(107_000, false, 1, af)).toBe(1_221)
    expect(familyAllowance(44_000, true, 1, af)).toBe(4_145)
    expect(familyAllowance(107_000, true, 1, af)).toBe(1_651)
  })
})

describe('in the projection', () => {
  const A = GOLDEN_ASSUMPTIONS
  const THIS_YEAR = A.today.year
  const indexation = { inflation: A.inflation, wageGrowth: A.wageGrowth }
  const benefitsOf = (children: number[], on: boolean): Household => ({ ...GOLDEN_HOUSEHOLD, children, kidsEffects: on ? { benefits: true, qppExclusion: false, leave: null } : null })
  const row = (rows: readonly YearRow[], year: number) => rows.find((r) => r.year === year)!

  it('nothing is paid unless the household said it counts the benefits — and a household that says nothing projects exactly as before', () => {
    const off = project(benefitsOf([THIS_YEAR - 1], false), A, {})
    expect(off.every((r) => r.household.childBenefit === undefined)).toBe(true)
    const without = project({ ...GOLDEN_HOUSEHOLD, children: [THIS_YEAR - 1] }, A, {})
    expect(off).toEqual(without)
  })

  it('pays the two benefits of the year from the income of the year before, tax-free, while the child is under 18', () => {
    const born = THIS_YEAR - 1
    const h = benefitsOf([born], true)
    const rows = project(h, A, {})
    // the first year reads today's earnings; the next ones, the family's net income of the year before
    const seed = h.persons.reduce((sum, x) => sum + x.salaryToday, 0)
    expect(row(rows, THIS_YEAR).household.childBenefit).toBeCloseTo(childBenefitsFor(h, THIS_YEAR, seed, false, paramsFor(THIS_YEAR, indexation).childBenefits), 2)
    const lastNet = Object.values(row(rows, THIS_YEAR).persons).reduce((sum, t) => sum + t.netIncome, 0)
    expect(row(rows, THIS_YEAR + 1).household.childBenefit).toBeCloseTo(childBenefitsFor(h, THIS_YEAR + 1, lastNet, false, paramsFor(THIS_YEAR + 1, indexation).childBenefits), 2)
    // under 18: the last year is the one the child turns 17; from the year they turn 18, nothing
    expect(row(rows, born + 17).household.childBenefit).toBeGreaterThan(0)
    expect(row(rows, born + 18).household.childBenefit).toBeUndefined()
  })

  it('a child still to come is paid from its birth year; a grown child is never paid for', () => {
    const rows = project(benefitsOf([THIS_YEAR + 2, THIS_YEAR - 30], true), A, {})
    expect(row(rows, THIS_YEAR + 1).household.childBenefit).toBeUndefined()
    expect(row(rows, THIS_YEAR + 2).household.childBenefit).toBeGreaterThan(0)
  })

  it('more is paid at a lower income, and it leaves the household better off (a tax-free inflow)', () => {
    const poorer: Household = { ...benefitsOf([THIS_YEAR - 1], true), persons: GOLDEN_HOUSEHOLD.persons.map((x) => ({ ...x, salaryToday: x.salaryToday * 0.3 })) }
    const rich = project(benefitsOf([THIS_YEAR - 1], true), A, {})
    const poor = project(poorer, A, {})
    expect(row(poor, THIS_YEAR + 1).household.childBenefit!).toBeGreaterThan(row(rich, THIS_YEAR + 1).household.childBenefit!)
    const off = project(benefitsOf([THIS_YEAR - 1], false), A, {})
    expect(rich.at(-1)!.household.netWorthEnd).toBeGreaterThan(off.at(-1)!.household.netWorthEnd)
  })

  it('a first death makes the family a single-parent one: the Allocation famille adds its supplement', () => {
    const born = THIS_YEAR
    const dying: Household = { ...benefitsOf([born], true), persons: GOLDEN_HOUSEHOLD.persons.map((x, i) => (i === 0 ? { ...x, horizonAge: THIS_YEAR + 3 - x.birth.year } : x)) }
    const rows = project(dying, A, {})
    // before the death 2 persons, after it 1: same income measure, the single parent's amount is higher by the supplement at least
    const before = row(rows, THIS_YEAR + 2).household.childBenefit!
    const after = row(rows, THIS_YEAR + 5).household.childBenefit!
    expect(before).toBeGreaterThan(0)
    expect(after).toBeGreaterThan(0)
  })
})
