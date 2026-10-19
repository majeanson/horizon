import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { deathQualification, type QualifyingRules } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Household } from './types.ts'

// WHO A DEATH LEAVES QPP BENEFITS TO. Art. 107 of the Act: the surviving spouse's pension and the death benefit are paid only for a contributor
// who made base contributions in at least a third of the years of their base contributory period and in at least three — or in ten, whatever
// the period; the death benefit also for 500 $ of base contributions when no pension was ever payable. Before this rule the engine paid the
// flat-rate portion (610,43 $ a month at 45–64) and the 2 500 $ to the widow of a spouse who never contributed at all.

const rules = makeRrqRules({ inflation: A.inflation, wageGrowth: A.wageGrowth })
const P = paramsFor(A.today.year, { inflation: A.inflation, wageGrowth: A.wageGrowth }).rrq
const Q: QualifyingRules = { share: P.survivorQualifyingShare, minYears: P.survivorQualifyingMinYears, years: P.survivorQualifyingYears, minContributions: P.deathBenefitMinContributions }
const born = { year: 1980, month: 1 }
const years = (from: number, to: number, amount: number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, amount]))
const q = (earnings: Record<number, number>, death: number, pensionStart: { year: number; month: number } | null = null) =>
  deathQualification({ birth: born, earnings, death: { year: death, month: 12 }, pensionStart }, rules, Q)

describe('art. 107 — the deceased contributor’s qualification', () => {
  it('reads its thresholds from the cited Act: a third, three years, ten years, 500 $', () => {
    expect([Q.share, Q.minYears, Q.years, Q.minContributions]).toEqual([1 / 3, 3, 10, 500])
  })

  it('a person who never earned above the exemption is not qualified, for either benefit', () => {
    const r = q({}, 2030)
    expect(r.contributedYears).toBe(0)
    expect(r.survivor).toBe(false)
    expect(r.deathBenefit).toBe(false)
    // and earnings AT the exemption carry no contribution either
    expect(q(years(2000, 2029, 3_500), 2030).survivor).toBe(false)
  })

  it('ten years of contributions qualify, whatever the length of the period', () => {
    // born 1980: the period runs from February 1998 to December 2050, 53 years; 10 of them is under a third, and still enough
    const r = q(years(2000, 2009, 40_000), 2050)
    expect(r.periodYears).toBe(53)
    expect(r.contributedYears).toBe(10)
    expect(r.survivor).toBe(true)
  })

  it('under ten: a third of the period AND at least three — 4 years in 12 qualify, 3 in 12 do not, 3 in 9 do', () => {
    // A death in 2009 makes a period of 1998 → 2009: 12 years. One in 2006 makes 9.
    expect(q(years(2006, 2009, 40_000), 2009).survivor).toBe(true) // 4 of 12
    expect(q(years(2007, 2009, 40_000), 2009).survivor).toBe(false) // 3 of 12 < 4
    expect(q(years(2004, 2006, 40_000), 2006).survivor).toBe(true) // 3 of 9
    expect(q(years(2005, 2006, 40_000), 2006).survivor).toBe(false) // 2 of 9: under three
  })

  it('the death benefit has a second way in: 500 $ of base contributions, only when no retirement pension was ever payable', () => {
    // two years at 40 000 $ in 2008–2009: (40 000 − 3 500) × 4,95 % = 1 806,75 $ a year, far past 500 $ — but 2 of 12 years
    const two = years(2008, 2009, 40_000)
    const r = q(two, 2009)
    expect(r.survivor).toBe(false)
    expect(r.baseContributions).toBeCloseTo(2 * 36_500 * 0.0495, 2)
    expect(r.deathBenefit).toBe(true)
    // a small year: 10 000 $ in 2009 is (10 000 − 3 500) × 4,95 % = 321,75 $, under 500 $
    expect(q({ 2009: 10_000 }, 2009).deathBenefit).toBe(false)
    // with a retirement pension already payable, the 500 $ path is closed
    expect(q(two, 2045, { year: 2041, month: 2 }).deathBenefit).toBe(false)
  })

  it('the base rate of a year since 2019 is the printed one less the first additional plan: 2023 at 60 000 $ is (60 000 − 3 500) × 5,4 %', () => {
    expect(q({ 2023: 60_000 }, 2023).baseContributions).toBeCloseTo(56_500 * 0.054, 2)
  })

  it('the period ends with the month before the pension: years after it carry no weight', () => {
    const r = q(years(2000, 2050, 40_000), 2050, { year: 2045, month: 2 })
    // February 1998 → January 2045: 48 calendar years, every one contributory except 1998 and 1999
    expect(r.periodYears).toBe(48)
    expect(r.contributedYears).toBe(46)
  })
})

describe('in the projection: no QPP survivor benefits from a spouse who never contributed', () => {
  // The golden couple, the spouse dying at 70 — once as he is (a contributor: death.test.ts follows him), once as a spouse who never earned.
  const dyingAt70 = (h: Household): Household => ({ ...h, persons: h.persons.map((p) => (p.id === 'spouse' ? { ...p, horizonAge: 70 } : p)) })
  const neverEarned: Household = dyingAt70({ ...H, persons: H.persons.map((p) => (p.id === 'spouse' ? { ...p, salaryToday: 0, earningsHistory: {}, retirementAge: Math.max(p.retirementAge, A.today.year - p.birth.year) } : p)) })
  const deathYear = 1981 + 70

  it('the widow of a contributor receives both (the control)', () => {
    const rows = project(dyingAt70(H), A, {})
    expect(rows.find((r) => r.year === deathYear + 1)!.persons.self!.deathBenefit).toBe(2500)
    expect(rows.find((r) => r.year === deathYear + 1)!.persons.self!.survivorPension).toBeGreaterThan(0)
  })

  it('the widow of a spouse with no contributions receives neither: no flat-rate portion, no death benefit, in any year', () => {
    const rows = project(neverEarned, A, {})
    const after = rows.filter((r) => r.year > deathYear)
    expect(after.length).toBeGreaterThan(10)
    for (const r of after) {
      expect(r.persons.self!.survivorPension, String(r.year)).toBe(0)
      expect(r.persons.self!.deathBenefit, String(r.year)).toBe(0)
    }
  })
})
