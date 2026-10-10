import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { leaveBenefit, leaveOf, leaveRulesOf, leaveSpans, type LeaveRules } from './parentalLeave.ts'
import { paramsFor } from './params/index.ts'
import { project, resolve } from './projection.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Household } from './types.ts'

// A PARENTAL LEAVE: the Act's weeks and rates, the spans they make, and how they fall in calendar years.

// Loi sur l'assurance parentale (RLRQ, chapitre A-29.011), arts. 7, 9, 10 and 18: 18 weeks of maternity, 5 of paternity, 32 of parental benefits to share;
// 70 % for the exclusive weeks and the first 7 shared ones, 55 % for the other 25.
const RULES: LeaveRules = { maternityWeeks: 18, paternityWeeks: 5, sharedWeeks: 32, sharedFirstWeeks: 7, rateHigh: 0.7, rateLow: 0.55 }

const person = (id: 'self' | 'spouse') => ({ id }) as Household['persons'][number]
const couple = (leave: { birthParent: 'self' | 'spouse'; birthParentWeeks: number; otherParentWeeks: number } | null, children: number[]): Household =>
  ({ persons: [person('self'), person('spouse')], children, spending: { workingToday: 0, retiredToday: 0 }, kidsEffects: leave ? { benefits: false, qppExclusion: false, leave } : null }) as Household
const alone = (leave: { birthParent: 'self'; birthParentWeeks: number; otherParentWeeks: number }, children: number[]): Household =>
  ({ persons: [person('self')], children, spending: { workingToday: 0, retiredToday: 0 }, kidsEffects: { benefits: false, qppExclusion: false, leave } }) as Household

const TODAY = 2026
const sumWeeks = (spans: { from: number; to: number }[]) => spans.reduce((s, x) => s + (x.to - x.from), 0)
const atRate = (spans: { from: number; to: number; rate: number }[], rate: number) => spans.filter((s) => s.rate === rate).reduce((sum, s) => sum + (s.to - s.from), 0)

describe('the spans of a leave', () => {
  it('the birth parent takes 18 weeks of maternity and the shared weeks they choose; the first 7 shared weeks are paid at 70 %, the others at 55 %', () => {
    const { birth } = leaveSpans({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, true, RULES)
    expect(sumWeeks(birth)).toBe(18 + 32)
    expect(atRate(birth, 0.7)).toBe(18 + 7)
    expect(atRate(birth, 0.55)).toBe(25)
  })

  it('the other parent takes 5 weeks of paternity beside, and their shared weeks follow the birth parent\'s; the 70 % weeks the first parent did not use are theirs', () => {
    const { birth, other } = leaveSpans({ birthParent: 'self', birthParentWeeks: 4, otherParentWeeks: 20 }, true, RULES)
    expect(sumWeeks(birth)).toBe(18 + 4)
    expect(atRate(birth, 0.7)).toBe(18 + 4)
    expect(sumWeeks(other)).toBe(5 + 20)
    // 7 − 4 = 3 shared weeks are still at 70 %, the other 17 at 55 %
    expect(atRate(other, 0.7)).toBe(5 + 3)
    expect(atRate(other, 0.55)).toBe(17)
    // their shared weeks start after the birth parent's: week 18 + 4
    expect(other.filter((s) => s.from >= 5)[0].from).toBe(22)
  })

  it('the shared weeks cannot exceed 32 together, and a lone parent has the lot', () => {
    const { birth, other } = leaveSpans({ birthParent: 'self', birthParentWeeks: 30, otherParentWeeks: 30 }, true, RULES)
    expect(sumWeeks(birth) - 18 + (sumWeeks(other) - 5)).toBe(32)
    const lone = leaveSpans({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 12 }, false, RULES)
    expect(lone.other).toEqual([])
    expect(sumWeeks(lone.birth)).toBe(50)
  })
})

describe('the leave in calendar years', () => {
  const h = couple({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2028])

  it('a birth in the middle of 2028 puts 26 weeks of the birth parent\'s leave in 2028 and the other 24 in 2029; nothing before or after', () => {
    expect(leaveOf(h, 'self', TODAY, 2027, RULES).weeksOff).toBe(0)
    expect(leaveOf(h, 'self', TODAY, 2028, RULES).weeksOff).toBe(26)
    expect(leaveOf(h, 'self', TODAY, 2029, RULES).weeksOff).toBe(24)
    expect(leaveOf(h, 'self', TODAY, 2030, RULES).weeksOff).toBe(0)
  })

  it('the other parent takes only their paternity weeks, all in the year of the birth', () => {
    expect(leaveOf(h, 'spouse', TODAY, 2028, RULES).weeksOff).toBe(5)
    expect(leaveOf(h, 'spouse', TODAY, 2029, RULES).weeksOff).toBe(0)
  })

  it('a child already born has no leave to come, and a household with no leave has none', () => {
    expect(leaveOf(couple({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2025, 2026]), 'self', TODAY, 2026, RULES).weeksOff).toBe(0)
    expect(leaveOf(couple(null, [2028]), 'self', TODAY, 2028, RULES).weeksOff).toBe(0)
  })

  it('a lone parent takes the maternity weeks and the shared ones', () => {
    const l = alone({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2028])
    expect(leaveOf(l, 'self', TODAY, 2028, RULES).weeksOff + leaveOf(l, 'self', TODAY, 2029, RULES).weeksOff).toBe(50)
  })

  it('two children to come add their weeks, never more than the year holds', () => {
    const two = couple({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2028, 2029])
    expect(leaveOf(two, 'self', TODAY, 2029, RULES).weeksOff).toBe(24 + 26) // the first leave's tail and the second's start
    const crowded = couple({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2028, 2028])
    expect(leaveOf(crowded, 'self', TODAY, 2028, RULES).weeksOff).toBe(52)
  })
})

describe('what the plan pays', () => {
  it('a share of the weekly insurable earnings, up to the plan\'s maximum', () => {
    const h = couple({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }, [2028])
    const y2028 = leaveOf(h, 'self', TODAY, 2028, RULES)
    // 26 weeks in 2028: 18 + 7 = 25 at 70 %, then 1 at 55 % — on 52 000 $ a year (1 000 $ a week)
    expect(leaveBenefit(y2028, 52_000, 103_000)).toBeCloseTo(25 * 0.7 * 1_000 + 1 * 0.55 * 1_000, 6)
    // above the maximum the benefit stops growing
    expect(leaveBenefit(y2028, 150_000, 103_000)).toBeCloseTo(leaveBenefit(y2028, 103_000, 103_000), 6)
    expect(leaveBenefit({ weeksOff: 0, paid: [] }, 80_000, 103_000)).toBe(0)
  })
})

describe('the published figures in the parameters', () => {
  it('are the Act\'s: 18, 5 and 32 weeks, 7 of them at 70 %, the rest at 55 %', () => {
    const P = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 })
    expect(leaveRulesOf(P.parentalLeave)).toEqual(RULES)
    // the same in every year: statute, not an index
    expect(leaveRulesOf(paramsFor(2060, { inflation: 0.02, wageGrowth: 0.03 }).parentalLeave)).toEqual(RULES)
  })
})

describe('in the projection', () => {
  const A = GOLDEN_ASSUMPTIONS
  const THIS_YEAR = A.today.year
  const BORN = THIS_YEAR + 2
  const withLeave = (leave: { birthParent: 'self' | 'spouse'; birthParentWeeks: number; otherParentWeeks: number } | null): Household => ({
    ...GOLDEN_HOUSEHOLD,
    children: [BORN],
    kidsEffects: leave ? { benefits: false, qppExclusion: false, leave } : null,
  })
  const salary = (i: number, year: number) => GOLDEN_HOUSEHOLD.persons[i].salaryToday * (1 + A.wageGrowth) ** (year - THIS_YEAR)
  const row = (rows: ReturnType<typeof project>, year: number) => rows.find((r) => r.year === year)!

  it('without a leave nothing changes: a child still to come costs only what it costs', () => {
    expect(project(withLeave(null), A, {})).toEqual(project({ ...GOLDEN_HOUSEHOLD, children: [BORN], kidsEffects: null }, A, {}))
  })

  it('the birth parent loses the pay of the weeks off — 26 in the birth year, 24 in the next — and nothing in the other years', () => {
    const rows = project(withLeave({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }), A, {})
    const base = project(withLeave(null), A, {})
    expect(row(rows, BORN - 1).persons.self!.employment).toBeCloseTo(row(base, BORN - 1).persons.self!.employment, 2)
    expect(row(rows, BORN).persons.self!.employment).toBeCloseTo(salary(0, BORN) * (1 - 26 / 52), 0)
    expect(row(rows, BORN + 1).persons.self!.employment).toBeCloseTo(salary(0, BORN + 1) * (1 - 24 / 52), 0)
    expect(row(rows, BORN + 2).persons.self!.employment).toBeCloseTo(row(base, BORN + 2).persons.self!.employment, 2)
    // the other parent keeps their pay but for the 5 weeks of paternity
    expect(row(rows, BORN).persons.spouse!.employment).toBeCloseTo(salary(1, BORN) * (1 - 5 / 52), 0)
  })

  it('the plan pays a taxable benefit instead: more income than the pay lost is not made up, and the benefit is taxed', () => {
    const rows = project(withLeave({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }), A, {})
    const year = row(rows, BORN)
    const P = paramsFor(BORN, { inflation: A.inflation, wageGrowth: A.wageGrowth })
    const spans = leaveOf(withLeave({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }), 'self', THIS_YEAR, BORN, RULES)
    const expected = leaveBenefit(spans, salary(0, BORN), P.payroll.qpipMaxInsurable)
    expect(year.persons.self!.otherIncome ?? 0).toBeCloseTo(expected, 0)
    expect(expected).toBeGreaterThan(0)
    expect(expected).toBeLessThan(salary(0, BORN) * (26 / 52)) // 70 % or 55 % of the pay of the weeks off, never all of it
  })

  it('the QPP record counts only the pay that was earned: the benefit is not pensionable', () => {
    const h = withLeave({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 })
    const rules = makeRrqRules({ inflation: A.inflation, wageGrowth: A.wageGrowth })
    const withIt = resolve(h.persons[0], A, {}, rules, h)
    const without = resolve(h.persons[0], A, {}, rules)
    expect(withIt.earnings[BORN]).toBeCloseTo(salary(0, BORN) * (1 - 26 / 52), 0)
    expect(without.earnings[BORN]).toBeCloseTo(salary(0, BORN), 0)
    expect(withIt.earnings[BORN + 1]).toBeLessThan(without.earnings[BORN + 1])
    expect(withIt.rrq.monthly).toBeLessThan(without.rrq.monthly)
  })

  it('a person already retired when the child is born has no pay to lose, and no benefit', () => {
    const retired: Household = { ...withLeave({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 }), persons: GOLDEN_HOUSEHOLD.persons.map((x) => ({ ...x, retirementAge: THIS_YEAR - x.birth.year })) }
    const rows = project(retired, A, {})
    expect(row(rows, BORN).persons.self!.employment).toBe(0)
    expect(row(rows, BORN).persons.self!.otherIncome ?? 0).toBe(0)
  })
})
