import { describe, expect, it } from 'vitest'
import { dbStart, dbYear, pensionAdjustment } from './dbPension.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { rregopPension } from './presets.ts'
import { project, resolve } from './projection.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Household, PersonId } from './types.ts'

// Regression tests for four engine fixes: the pension start held to the leaving date, a salary frozen for someone who has already
// left, the pension adjustment charged on plan pay only and up to the service cap, and the market path counted from today at the earliest.

const A = GOLDEN_ASSUMPTIONS
const rules = paramsFor(A.today.year, { inflation: A.inflation, wageGrowth: A.wageGrowth }).accounts
const withSelf = (over: Record<string, unknown>): Household => ({
  ...GOLDEN_HOUSEHOLD,
  persons: GOLDEN_HOUSEHOLD.persons.map((p) => (p.id === ('self' as PersonId) ? { ...p, ...over } : p)),
})

describe('the pension never starts before the employer is left', () => {
  const birth = { year: 1978, month: 3 }
  const base = { birth, today: A.today, salaryAt: () => 85_000, mgaAt: () => 70_000 }
  const pension = rregopPension({ serviceYearsToDate: 12, startAge: 60 })

  it('leaving at 65 with a typed start age of 60: the start is the leaving month, and the early reduction follows it', () => {
    const s = dbStart(pension, { ...base, leaving: { year: 2043, month: 3 } })
    // the month after the birthday month of age 65
    expect(s.startIndex).toBe((1978 + 65) * 12 + 2 + 1)
    // paid at 65 or later, the plan's own unreduced age or earlier: nothing is cut
    expect(s.earlyReduction).toBe(0)
    expect(dbYear(s, 2042, 0.02)).toBe(0)
    expect(dbYear(s, 2044, 0.02)).toBeGreaterThan(0)
  })

  it('leaving AFTER the typed start age but before the unreduced age: the reduction counts the years from the leaving date, not from 60', () => {
    const early = dbStart(pension, { ...base, leaving: { year: 1978 + 60, month: 3 } })
    const later = dbStart(pension, { ...base, leaving: { year: 1978 + 62, month: 3 } })
    expect(later.earlyReduction).toBeLessThan(early.earlyReduction)
    expect(later.startIndex).toBeGreaterThan(early.startIndex)
  })

  it('in the projection: no pension is paid in a year before the person leaves', () => {
    const h = withSelf({ retirementAge: 65, pensions: [pension] })
    const rows = project(h, A)
    for (const r of rows) if (r.year < 1978 + 65) expect(r.persons.self?.db ?? 0, String(r.year)).toBe(0)
  })
})

describe('the pension salary of someone who has already left', () => {
  it('is frozen at the salary typed, never deflated back before today', () => {
    // born 1978, retirement at 45: left in 2023, three years before today (2026)
    const h = withSelf({ retirementAge: 45, salaryToday: 85_000, pensions: [rregopPension({ serviceYearsToDate: 12, startAge: 60 })] })
    const r = resolve(h.persons[0], A, {}, makeRrqRules({ inflation: A.inflation, wageGrowth: A.wageGrowth }), h)
    expect(r.db[0].start.averageSalary).toBeCloseTo(85_000, 2)
  })
})

describe('the pension adjustment', () => {
  const p = rregopPension({ serviceYearsToDate: 40, startAge: 60 })

  it('is nothing once the service has reached the plan\'s maximum', () => {
    expect(pensionAdjustment([p], 80_000, true, rules, (d) => d.serviceYearsToDate)).toBe(0)
    // still the full rate with no service reader (backward compatible)
    expect(pensionAdjustment([p], 80_000, true, rules)).toBeGreaterThan(0)
  })

  it('credits only what is left under the cap', () => {
    const near = rregopPension({ serviceYearsToDate: 39.5, startAge: 60 })
    const full = pensionAdjustment([rregopPension({ serviceYearsToDate: 10, startAge: 60 })], 80_000, true, rules)
    const half = pensionAdjustment([near], 80_000, true, rules, (d) => d.serviceYearsToDate)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(full)
  })
})

describe('the pension adjustment in the projection', () => {
  // A pension that never pays (it starts after the horizon) so the only thing it can change is the RRSP room it reports an adjustment against.
  const solo = (accrualRate: number): Household => {
    const self = GOLDEN_HOUSEHOLD.persons[0]
    return {
      ...GOLDEN_HOUSEHOLD,
      livesAlone: true,
      spending: { workingToday: 20_000, retiredToday: 20_000 },
      persons: [
        {
          ...self,
          // left in 2023 (born 1978): from today on every dollar of pay is part-time pay, none of it earned in the plan
          retirementAge: 45,
          partTime: { untilAge: 65, share: 0.9 },
          salaryToday: 150_000,
          horizonAge: 85,
          accounts: { ...self.accounts, rrsp: { balance: 100_000, room: 0, annualContribution: 0 } },
          pensions: [{ ...rregopPension({ serviceYearsToDate: 20, startAge: 90 }), accrualRate }],
        },
      ],
    }
  }
  it('part-time pay after leaving does not cost RRSP room (it is not plan pay)', () => {
    const a = { ...A, surplusToRrsp: true }
    const withAdj = project(solo(0.02), a)
    const without = project(solo(0), a)
    withAdj.forEach((r, i) => expect(r.persons.self?.balancesEnd.rrsp ?? 0, String(r.year)).toBeCloseTo(without[i].persons.self?.balancesEnd.rrsp ?? 0, 2))
  })
})

describe('the market path is counted from today at the earliest', () => {
  it('someone who left three years ago still gets the bad start in their first projected year', () => {
    const h = withSelf({ retirementAge: 45, salaryToday: 0, pensions: [] })
    const smooth = project(h, { ...A, marketPath: { preset: 'smooth', custom: [] } })
    const bad = project(h, { ...A, marketPath: { preset: 'custom', custom: [-0.5] } })
    expect(bad[0].household.netWorthEnd).toBeLessThan(smooth[0].household.netWorthEnd)
  })
})
